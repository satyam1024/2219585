import express from "express";
import cors from "cors";
import { Log } from "../shared/middleware/logger.js";
import geoip from "geoip-lite";

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

app.set("trust proxy", true);

let urls = [];

const getClientIp = (req) => {
  return req.ip;
};

app.post("/shorten", async (req, res) => {
  const { longURL, validityMinutes = 30, customShortcode } = req.body;
  const clientIp = getClientIp(req);

  if (
    !longURL ||
    typeof longURL !== "string" ||
    !/^https?:\/\//i.test(longURL)
  ) {
    return res.status(400).json({
      message:
        "Invalid or missing longURL. Must be a valid URL starting with http/https.",
    });
  }

  if (typeof validityMinutes !== "number" || validityMinutes <= 0) {
    return res
      .status(400)
      .json({ message: "Invalid validityMinutes. Must be a positive number." });
  }

  let shortcode = customShortcode;
  if (shortcode) {
    if (!/^[a-zA-Z0-9_-]{4,10}$/.test(shortcode)) {
      return res.status(400).json({
        message:
          "Invalid custom shortcode format. Must be 4-10 alphanumeric characters, hyphens, or underscores.",
      });
    }
  } else {
    do {
      shortcode = Math.random().toString(36).substring(2, 8);
    } while (urls.find((u) => u.shortcode === shortcode));
  }

  if (urls.find((u) => u.shortcode === shortcode)) {
    return res.status(409).json({
      message:
        "Shortcode already exists. Please try a different custom shortcode or let us generate one.",
    });
  }

  const createdAt = Date.now();
  const expiresAt = createdAt + validityMinutes * 60000;

  urls.push({ shortcode, longURL, createdAt, expiresAt, clicks: [] });

  try {
    await Log(
      "backend",
      "info",
      "service",
      `Created shortcode ${shortcode} for ${longURL} from IP ${clientIp}`,
      req.headers.authorization?.split(" ")[1]
    );
  } catch (error) {
    console.error("Error logging shortcode creation:", error);
  }

  res.status(201).json({
    shortURL: `${BASE_URL}/r/${shortcode}`,
    expiresAt: new Date(expiresAt).toISOString(),
  });
});

app.get("/r/:code", async (req, res) => {
  const item = urls.find((u) => u.shortcode === req.params.code);
  const clientIp = getClientIp(req);
  const geoInfo = await getGeoLocation(clientIp);

  if (!item) {
    try {
      await Log(
        "backend",
        "warn",
        "service",
        `Attempted access to non-existent shortcode: ${req.params.code} from IP ${clientIp}`,
        req.headers.authorization?.split(" ")[1]
      );
    } catch (error) {
      console.error("Logging error:", error);
    }
    return res.status(404).json({ message: "Shortcode not found" });
  }

  if (Date.now() > item.expiresAt) {
    urls = urls.filter((u) => u.shortcode !== req.params.code);
    try {
      await Log(
        "backend",
        "info",
        "service",
        `Expired shortcode accessed: ${req.params.code} from IP ${clientIp}`,
        req.headers.authorization?.split(" ")[1]
      );
    } catch (error) {
      console.error("Logging error:", error);
    }
    return res.status(410).json({ message: "Shortcode expired" });
  }

  item.clicks.push({
    timestamp: Date.now(),
    ip: clientIp,
    userAgent: req.headers["user-agent"] || "N/A",
    referrer: req.headers.referer || req.headers.referrer || null,
    geo: geoInfo,
  });

  try {
    await Log(
      "backend",
      "info",
      "service",
      `Redirecting ${req.params.code} to ${item.longURL} (Clicks: ${item.clicks.length})`,
      req.headers.authorization?.split(" ")[1]
    );
  } catch (error) {
    console.error("Error logging redirection:", error);
  }

  res.redirect(302, item.longURL);
});

app.get("/shorturls/:code", async (req, res) => {
  const item = urls.find((u) => u.shortcode === req.params.code);
  const clientIp = getClientIp(req);

  if (!item) {
    try {
      await Log(
        "backend",
        "warn",
        "service",
        `Attempted metadata access to non-existent shortcode: ${req.params.code} from IP ${clientIp}`,
        req.headers.authorization?.split(" ")[1]
      );
    } catch (error) {
      console.error("Logging error:", error);
    }
    return res.status(404).json({ message: "Shortcode not found" });
  }

  try {
    await Log(
      "backend",
      "info",
      "service",
      `Fetched stats for shortcode: ${req.params.code}`,
      req.headers.authorization?.split(" ")[1]
    );
  } catch (error) {
    console.error("Logging error:", error);
  }

  res.json({
    shortcode: item.shortcode,
    shortURL: `${BASE_URL}/r/${item.shortcode}`,
    originalURL: item.longURL,
    totalClicks: item.clicks.length,
    metadata: {
      createdAt: new Date(item.createdAt).toISOString(),
      expiresAt: new Date(item.expiresAt).toISOString(),
      remainingValidityMinutes: Math.floor(
        (item.expiresAt - Date.now()) / 60000
      ),
    },
    clickStats: item.clicks.map((click) => ({
      timestamp: new Date(click.timestamp).toLocaleString(),
      ip: click.ip,
      userAgent: click.userAgent,
      referrer: click.referrer,
      geo: click.geo || { country: "N/A", city: "N/A" },
    })),
  });
});

app.get("/shorturls", async (req, res) => {
  try {
    const allShortUrls = urls.map((item) => ({
      shortcode: item.shortcode,
      shortURL: `${BASE_URL}/r/${item.shortcode}`,
      originalURL: item.longURL,
      createdAt: new Date(item.createdAt).toISOString(),
      expiresAt: new Date(item.expiresAt).toISOString(),
      totalClicks: item.clicks.length,
    }));

    await Log(
      "backend",
      "info",
      "service",
      `Fetched list of all short URLs (${allShortUrls.length} items)`,
      req.headers.authorization?.split(" ")[1]
    );

    res.json(allShortUrls);
  } catch (error) {
    console.error("Error fetching all short URLs:", error);
    await Log(
      "backend",
      "error",
      "service",
      `Failed to fetch all short URLs: ${error.message}`,
      req.headers.authorization?.split(" ")[1]
    );
    res.status(500).json({ message: "Failed to retrieve all short URLs." });
  }
});

app.post("/logs", (req, res) => {
  const { stack, level, package: pkg, message } = req.body;
  if (!stack || !level || !pkg || !message) {
    return res.status(400).json({
      message: "Missing required log fields (stack, level, package, message)",
    });
  }
  console.log(
    `[${String(stack).toUpperCase()}] [${String(
      level
    ).toUpperCase()}] (${String(pkg)}): ${String(message)}`
  );
  res.status(200).json({ message: "Logged" });
});

async function getGeoLocation(ip) {
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.0.0.1")) {
    return { country: "Localhost", city: "Localhost" };
  }
  const geo = geoip.lookup(ip);
  return geo
    ? { country: geo.country, city: geo.city }
    : { country: "Unknown", city: "Unknown" };
}

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

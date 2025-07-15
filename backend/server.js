import express from "express";
import cors from "cors";
import { Log } from "../shared/middleware/logger.js";

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

let urls = [];

app.post("/shorten", async (req, res) => {
  const { longURL, validityMinutes = 30, customShortcode } = req.body;

  if (
    !longURL ||
    typeof longURL !== "string" ||
    !/^https?:\/\//i.test(longURL)
  ) {
    return res
      .status(400)
      .json({
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
      return res
        .status(400)
        .json({
          message:
            "Invalid custom shortcode format. Must be 4-10 alphanumeric characters, hyphens, or underscores.",
        });
    }
  } else {
    shortcode = Math.random().toString(36).substring(2, 8);
  }

  if (urls.find((u) => u.shortcode === shortcode)) {
    return res
      .status(409)
      .json({
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
      `Created shortcode ${shortcode} for ${longURL}`,
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

  if (!item) {
    try {
      await Log(
        "backend",
        "warn",
        "service",
        `Attempted access to non-existent shortcode: ${req.params.code}`,
        req.headers.authorization?.split(" ")[1]
      );
    } catch (error) {}
    return res.status(404).json({ message: "Shortcode not found" });
  }

  if (Date.now() > item.expiresAt) {
    urls = urls.filter((u) => u.shortcode !== req.params.code);
    try {
      await Log(
        "backend",
        "info",
        "service",
        `Expired shortcode accessed: ${req.params.code}`,
        req.headers.authorization?.split(" ")[1]
      );
    } catch (error) {}
    return res.status(410).json({ message: "Shortcode expired" });
  }

  item.clicks.push({
    timestamp: Date.now(),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    referrer: req.headers.referrer || null,
  });

  try {
    await Log(
      "backend",
      "info",
      "service",
      `Redirecting ${req.params.code} to ${item.longURL}`,
      req.headers.authorization?.split(" ")[1]
    );
  } catch (error) {
    console.error("Error logging redirection:", error);
  }

  res.redirect(302, item.longURL);
});

app.get("/shorturls/:code", async (req, res) => {
  const item = urls.find((u) => u.shortcode === req.params.code);
  if (!item) {
    try {
      await Log(
        "backend",
        "warn",
        "service",
        `Attempted metadata access to non-existent shortcode: ${req.params.code}`,
        req.headers.authorization?.split(" ")[1]
      );
    } catch (error) {}
    return res.status(404).json({ message: "Shortcode not found" });
  }

  res.json({
    originalURL: item.longURL,
    clicks: item.clicks.length,
    metadata: {
      createdAt: new Date(item.createdAt).toISOString(),
      expiresAt: new Date(item.expiresAt).toISOString(),
      remainingValidityMinutes: Math.floor(
        (item.expiresAt - Date.now()) / 60000
      ),
    },
    clickStats: item.clicks,
  });
});

app.post("/logs", (req, res) => {
  const { stack, level, package: pkg, message } = req.body;
  if (!stack || !level || !pkg || !message) {
    return res
      .status(400)
      .json({
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

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

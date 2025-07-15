import axios from "axios";

const AUTH_TOKEN = "";

const stacks = ["backend", "frontend"];
const levels = ["debug", "info", "warn", "error", "fatal"];
const backendPackages = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
];
const frontendPackages = ["api"];

export async function Log(stack, level, pkg, message) {
  try {
    if (!stacks.includes(stack)) throw new Error("Invalid stack");
    if (!levels.includes(level)) throw new Error("Invalid level");

    const validPackages =
      stack === "backend" ? backendPackages : frontendPackages;
    if (!validPackages.includes(pkg)) throw new Error("Invalid package");

    const payload = {
      stack,
      level,
      package: pkg,
      message,
    };

    const response = await axios.post(
      "http://20.244.56.144/evaluation-service/logs",
      payload,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      console.error("Failed to send log:", response.data);
    }
  } catch (err) {
    console.error("Logging error:", err.message || err);
  }
}

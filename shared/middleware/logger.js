import axios from "axios";

AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzYXR5YW1rYXRoYWl0NEBnbWFpbC5jb20iLCJleHAiOjE3NTI1NTYwNDYsImlhdCI6MTc1MjU1NTE0NiwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjRmNWM4MDg5LWMxYzAtNDFlNi04YThjLThjODcwN2I1MjVlOSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InNhdHlhbSBrYXRoYWl0Iiwic3ViIjoiYzU3Mjg1NTItZThmNy00YmE5LTgwMjMtZWM0ZmEyMjNiYjdjIn0sImVtYWlsIjoic2F0eWFta2F0aGFpdDRAZ21haWwuY29tIiwibmFtZSI6InNhdHlhbSBrYXRoYWl0Iiwicm9sbE5vIjoiMjIxOTU4NSIsImFjY2Vzc0NvZGUiOiJRQWhEVXIiLCJjbGllbnRJRCI6ImM1NzI4NTUyLWU4ZjctNGJhOS04MDIzLWVjNGZhMjIzYmI3YyIsImNsaWVudFNlY3JldCI6ImJuYkphcmVrc2d0VGtTTnUifQ.BWotFfzsxGZvZXijxIrgHQ7uoBNqFkmWHeh5l368-K4";
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

export async function Log(stack, level, pkg, message, token) {
  try {
    const AUTH_TOKEN = token || process.env.AUTH_TOKEN;
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

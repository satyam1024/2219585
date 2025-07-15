// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
    port: 3000,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "..", "shared"),
    },
  },
});

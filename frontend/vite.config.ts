/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Inside compose the backend is reachable as http://api:8000.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://api:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Vite rejects unknown Host headers; "web" is how the e2e container calls us.
    allowedHosts: ["localhost", "web"],
    // Same-origin proxy: the browser only talks to :5173, so no CORS in dev
    // and cookies (auth, later) just work.
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      // Uploaded photos/sounds and the default meow, served by the API.
      "/media": { target: apiTarget, changeOrigin: true },
    },
    // vboxsf emits no inotify events, so file watching must poll.
    watch: { usePolling: true, interval: 300 },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});

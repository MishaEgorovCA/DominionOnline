import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/splendor/",
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      "/api": "http://127.0.0.1:3333",
      "/ws": {
        target: "ws://127.0.0.1:3333",
        ws: true,
      },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Em dev, /api é encaminhado para o backend Express em :3001
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});

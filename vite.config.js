import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // En développement local, proxy les appels /api vers Vercel dev
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

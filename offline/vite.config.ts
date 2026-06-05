import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** GitHub Pages 子路径部署时设置，如 /linkme.ltd/；Vercel/独立域名用默认 / */
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".."),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

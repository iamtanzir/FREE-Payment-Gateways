import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// The merchant SPA lives in src/dashboard and is served by the gateway at
// /app/ (same process, same domain). Standalone dev: `npm run dev:app` →
// http://localhost:8080/. Production build goes to ../../public/app.
// Override the base with VITE_BASE_PATH=/ if hosting the SPA at a site root.
export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH || "/app/",
  // SPA root is this directory (config lives in src/dashboard/), regardless of cwd.
  root: __dirname,
  // .env lives at the repo root (same file the gateway + scripts use).
  envDir: path.resolve(__dirname, "../.."),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../../public/app"),
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));

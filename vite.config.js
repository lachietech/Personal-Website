import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: path.resolve(import.meta.dirname, "public/static/main/react"),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(import.meta.dirname, "frontend/main/main.jsx"),
      formats: ["es"],
      fileName: () => "main.js"
    },
    rollupOptions: { output: { assetFileNames: "[name][extname]" } }
  }
});

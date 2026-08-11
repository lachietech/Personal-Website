import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: path.resolve(import.meta.dirname, "public/static/react"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        website: path.resolve(import.meta.dirname, "src/main.jsx"),
        "client-portal": path.resolve(
          import.meta.dirname,
          "src/clientPortal.jsx",
        ),
        "hfss-uniforms": path.resolve(
          import.meta.dirname,
          "src/hfssUniforms.jsx",
        ),
        "meander-suite": path.resolve(
          import.meta.dirname,
          "src/meanderSuite.jsx",
        ),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});

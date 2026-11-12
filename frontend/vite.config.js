import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { copyStaticFiles } from "./scripts/build-static.js";
import { resolveApiOrigin } from "./src/api/http.js";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: "frontend-static-files",
      buildStart() {
        this.addWatchFile(path.resolve(import.meta.dirname, "public"));
        this.addWatchFile(path.resolve(import.meta.dirname, "src/assets"));
      },
      writeBundle: copyStaticFiles,
    },
  ],
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.VITE_API_URL": JSON.stringify(
      resolveApiOrigin(
        loadEnv(mode, import.meta.dirname, "VITE_").VITE_API_URL,
        mode === "production",
      ),
    ),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/static/react"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        website: path.resolve(import.meta.dirname, "src/main.jsx"),
        billing: path.resolve(import.meta.dirname, "src/billing.jsx"),
        konnect: path.resolve(import.meta.dirname, "src/konnect.jsx"),
        visitpulse: path.resolve(import.meta.dirname, "src/visitpulse.jsx"),
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
}));

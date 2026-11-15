import express from "express";
import helmet from "helmet";
import path from "node:path";
import { createApiProxy } from "./proxy.js";
import { createPageRoutes } from "./pages.js";

export function createFrontendApp({
  backendUrl = "http://127.0.0.1:5000",
  documentDirectory = path.resolve(import.meta.dirname, "../dist"),
  trustProxy = false,
  isProduction = false,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", ...(isProduction ? [] : ["http://localhost:5000", "http://127.0.0.1:5000"])],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          workerSrc: ["'none'"],
          manifestSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
    }),
  );
  app.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "frontend" }),
  );
  app.use(createApiProxy(backendUrl));
  app.use(createPageRoutes(documentDirectory));
  app.use(express.static(documentDirectory, { index: false }));
  app.use((_req, res) => {
    res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    res.status(404).sendFile(path.join(documentDirectory, "404.html"));
  });
  app.use((error, _req, res, _next) => {
    console.error("Frontend request failed:", error.message);
    if (res.headersSent) return res.end();
    res.set({
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.status(500).sendFile(path.join(documentDirectory, "500.html"));
  });
  return app;
}

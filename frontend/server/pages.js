import express from "express";
import path from "node:path";
import { pageRoutes, pageRedirects } from "../scripts/page-routes.js";

export function createPageRoutes(documentDirectory) {
  const router = express.Router();
  const document = (name) => (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(documentDirectory, name), { cacheControl: false });
  };
  router.get("/", document("index.html"));
  for (const [route, name] of Object.entries(pageRoutes)) {
    router.get(route, document(name));
  }
  for (const [route, destination] of Object.entries(pageRedirects)) {
    router.get(route, (_req, res) => res.redirect(destination));
  }
  return router;
}

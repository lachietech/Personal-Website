import express from "express";
import path from "path";

const router = express.Router();
const basePath = "/hfssuniformsapp";

const appDocument = path.resolve(
  import.meta.dirname,
  "../../../../public/hfss-uniforms.html",
);

const appRoutes = [
  "/dashboard",
  "/sales-records",
  "/pos",
  "/receipts",
  "/stock-manager",
  "/access-management",
  "/account",
];

function toAppPath(route) {
  return `${basePath}${route}`;
}

function sendAppDocument(_req, res) {
  // The React shell contains no private data. Send it immediately and let the
  // authenticated API decide whether the browser has a valid session. This
  // prevents a slow database connection from turning every page request into
  // a blank document while keeping all application data protected.
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(appDocument, { cacheControl: false });
}

router.get("/", (_req, res) => {
  return res.redirect(toAppPath("/dashboard"));
});

router.get("/signin", sendAppDocument);

router.get("/monthly-update", (_req, res) => {
  res.redirect(toAppPath("/sales-records"));
});

for (const route of appRoutes) {
  router.get(route, sendAppDocument);
}

export default router;

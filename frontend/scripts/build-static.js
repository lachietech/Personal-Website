import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pageRoutes, pageRedirects } from "./page-routes.js";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
export function copyStaticFiles() {
  mkdirSync(dist, { recursive: true });
  cpSync(path.join(root, "public"), dist, {
    recursive: true,
    filter: (source) => source !== path.join(root, "public/static/react"),
  });
  cpSync(path.join(root, "src/assets"), path.join(dist, "static"), {
    recursive: true,
  });
  function publishPage(route, html) {
    const target = path.join(dist, route.slice(1));
    mkdirSync(target, { recursive: true });
    // Render resolves clean URLs to .html; directory indexes also work on
    // static hosts that redirect /path to /path/. All asset URLs are absolute.
    writeFileSync(`${target}.html`, html);
    writeFileSync(path.join(target, "index.html"), html);
  }
  for (const [route, document] of Object.entries(pageRoutes)) {
    publishPage(
      route,
      readFileSync(path.join(root, "public", document), "utf8"),
    );
  }
  for (const [route, destination] of Object.entries(pageRedirects)) {
    publishPage(
      route,
      `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex"><title>Continue to the Uniform Shop</title>
<meta http-equiv="refresh" content="0;url=${destination}">
</head><body><a href="${destination}">Continue to the Uniform Shop</a></body></html>`,
    );
  }
}

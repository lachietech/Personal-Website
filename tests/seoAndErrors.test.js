import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readPublicFile(name) {
  return readFile(new URL(`../public/${name}`, import.meta.url), "utf8");
}

test("public pages expose crawl and social metadata", async () => {
  const home = await readPublicFile("index.html");
  const portal = await readPublicFile("clientportal.html");

  assert.match(home, /rel="canonical"/);
  assert.match(home, /property="og:title"/);
  assert.match(home, /name="twitter:card"/);
  assert.match(home, /rel="manifest"/);
  assert.match(portal, /noindex, nofollow/);
});

test("custom error pages are non-indexable and offer recovery actions", async () => {
  const [notFound, serverError] = await Promise.all([
    readPublicFile("404.html"),
    readPublicFile("500.html"),
  ]);

  assert.match(notFound, /Page not found/);
  assert.match(notFound, /noindex/);
  assert.match(notFound, /Return home/);
  assert.match(serverError, /Something went wrong/);
  assert.match(serverError, /noindex, nofollow/);
  assert.match(serverError, /Try again/);
});

test("robots and sitemap expose only public destinations", async () => {
  const [robots, sitemap] = await Promise.all([
    readPublicFile("robots.txt"),
    readPublicFile("sitemap.xml"),
  ]);

  assert.match(robots, /Disallow: \/clientportal\//);
  assert.match(
    robots,
    /Sitemap: https:\/\/nielseninnovations\.com\/sitemap\.xml/,
  );
  assert.doesNotMatch(sitemap, /clientportal|hfssuniformsapp/);
});

import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { pagePath } from "../frontend/src/pagePath.js";
import { portalDestination } from "../frontend/src/apps/client-portal/utils/appRoutes.js";

const requireFrontend = createRequire(
  new URL("../frontend/package.json", import.meta.url),
);
const express = requireFrontend("express");
let server, origin;
before(async () => {
  // Deliberately use a plain static file server: no application route handlers,
  // API proxy, Render rewrites or SPA fallback may hide missing build output.
  const app = express();
  app.use(
    express.static(
      fileURLToPath(new URL("../frontend/dist", import.meta.url)),
      { extensions: ["html"] },
    ),
  );
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("production portal deep links work using static files alone", async () => {
  const routes = {
    "/clientportal": "client-portal",
    "/clientportal/login": "client-portal",
    "/clientportal/account": "client-portal",
    "/clientportal/billing": "billing",
    "/clientportal/konnect": "konnect",
    "/clientportal/visitpulse": "visitpulse",
    "/hfssuniformsapp/signin": "hfss-uniforms",
    "/hfssuniformsapp/pos": "hfss-uniforms",
    "/meandersuite/login": "meander-suite",
  };
  for (const [route, bundle] of Object.entries(routes)) {
    for (const suffix of ["", "/", ".html", "/index.html"]) {
      const response = await fetch(
        origin + route + suffix + "?next=%2Fclientportal%2Fkonnect",
      );
      assert.equal(response.status, 200, route + suffix);
      assert.match(response.headers.get("content-type"), /text\/html/);
      const html = await response.text();
      assert.ok(
        html.includes(`src="/static/react/${bundle}.js"`),
        route + suffix,
      );
      assert.equal(pagePath(new URL(response.url).pathname), route);
      assert.equal(
        new URL(response.url).searchParams.get("next"),
        "/clientportal/konnect",
      );
    }
  }
  assert.equal((await fetch(origin + "/clientportal/not-a-page")).status, 404);
});

test("all optional Render rewrites have corresponding physical build files", () => {
  const blueprint = readFileSync(
    new URL("../render.yaml", import.meta.url),
    "utf8",
  );
  for (const [, route, document] of blueprint.matchAll(
    /type: rewrite\s+source: (\S+)\s+destination: \/(\S+)/g,
  )) {
    const expected = readFileSync(
      new URL(`../frontend/public/${document}`, import.meta.url),
      "utf8",
    );
    for (const suffix of [".html", "/index.html"]) {
      assert.equal(
        readFileSync(
          new URL(`../frontend/dist${route}${suffix}`, import.meta.url),
          "utf8",
        ),
        expected,
        route + suffix,
      );
    }
  }
});

test("static login variants and post-login destinations normalize without accepting external redirects", () => {
  for (const suffix of ["", "/", ".html", "/index.html"]) {
    assert.equal(
      pagePath("/clientportal/login" + suffix),
      "/clientportal/login",
    );
    assert.equal(
      pagePath("/hfssuniformsapp/signin" + suffix),
      "/hfssuniformsapp/signin",
    );
    assert.equal(
      portalDestination("/clientportal/konnect" + suffix),
      "/clientportal/konnect",
    );
  }
  for (const value of [
    undefined,
    "//evil.example",
    "https://evil.example/clientportal",
    "/clientportal/../other",
    "/clientportal/login",
  ]) {
    assert.equal(portalDestination(value), "/clientportal");
  }
});

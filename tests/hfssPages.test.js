import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import pageRoutes from "../src/backend/hfssuniformsapp/routing/pages.js";

const appPaths = [
  "/signin",
  "/dashboard",
  "/sales-records",
  "/pos",
  "/receipts",
  "/stock-manager",
  "/access-management",
  "/account",
];

let server;
let origin;

before(async () => {
  const app = express();
  app.use("/hfssuniformsapp", pageRoutes);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

for (const path of appPaths) {
  test(`HFSS page shell renders at ${path}`, async () => {
    const response = await fetch(`${origin}/hfssuniformsapp${path}`);
    const document = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/html/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(document, /<div id="root"><\/div>/);
    assert.match(document, /\/static\/react\/hfss-uniforms\.js/);
  });
}

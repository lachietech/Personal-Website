import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  apiFetch,
  apiUrl,
  resolveApiOrigin,
  PRODUCTION_API_ORIGIN,
} from "../src/api/http.js";

test("static builds target the public API and reject unsafe deployment URLs", () => {
  assert.equal(
    resolveApiOrigin(undefined, true),
    "https://personal-website-53mf.onrender.com",
  );
  assert.equal(resolveApiOrigin(undefined, false), "");
  assert.equal(
    resolveApiOrigin(PRODUCTION_API_ORIGIN + "/", true),
    PRODUCTION_API_ORIGIN,
  );
  assert.equal(
    resolveApiOrigin("http://localhost:5000"),
    "http://localhost:5000",
  );
  for (const value of [
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com/api",
    "https://example.com?secret=value",
    "javascript:alert(1)",
  ])
    assert.throws(() => resolveApiOrigin(value, true));
  assert.throws(() => apiUrl("//untrusted.example/path"));
  assert.throws(() => apiUrl("https://untrusted.example/path"));
});

test("API requests include backend cookies while public contact requests omit them", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return Response.json({ success: true });
  });
  await apiFetch("/csrf-token", { credentials: "same-origin" });
  await apiFetch("/clientportal/api/konnect/contact", {
    method: "POST",
    credentials: "omit",
    body: "{}",
  });
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(calls[1].options.credentials, "omit");
  assert.equal(calls[1].options.body, "{}");
});

test("Uniform Shop obtains its CSRF token from the API without reading document cookies", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/csrf-token"))
      return Response.json({ csrfToken: "initial-token" });
    if (url.endsWith("/me"))
      return Response.json(
        { user: {} },
        { headers: { "X-CSRF-Token": "updated-token" } },
      );
    return Response.json({ success: true });
  });
  const { uniformRequest } = await import(
    "../src/apps/hfss-uniforms/api/uniformApi.js"
  );
  await uniformRequest("/api/auth/login", { method: "POST" });
  assert.equal(calls[0].url, "/hfssuniformsapp/api/csrf-token");
  assert.equal(calls[1].options.headers.get("x-csrf-token"), "initial-token");
  await uniformRequest("/api/auth/me");
  await uniformRequest("/api/auth/logout", { method: "POST" });
  assert.equal(calls[3].options.headers.get("x-csrf-token"), "updated-token");
  assert.ok(calls.every(({ options }) => options.credentials === "include"));
});

test("production commands never start the frontend preview server", () => {
  const frontend = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url)),
  );
  const root = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url)),
  );
  assert.equal(frontend.scripts.start, undefined);
  assert.equal(root.scripts.start, "npm run start:backend");
  assert.equal(root.scripts["start:frontend"], undefined);
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../server/server.js", import.meta.url))],
    {
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /frontend is a static site/);
});

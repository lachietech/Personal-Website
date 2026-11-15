import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { isApiPath } from "../../../frontend/server/proxy.js";
import { createFrontendApp } from "../../../frontend/server/app.js";

process.env.NODE_ENV = "development";
process.env.SECRET_KEY = "security-test-session-secret";
process.env.CSRF_SECRET = "security-test-csrf-secret";
const { createApp } = await import("../../app.js");

async function listen(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test("global budget covers every router, invalid bodies, preflights and asset-like paths", async t => {
  const base = await listen(t, createApp());
  const csrf = await fetch(base + "/csrf-token", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(csrf.status, 200);
  assert.equal(csrf.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(csrf.headers.get("access-control-allow-credentials"), "true");
  assert.ok(csrf.headers.getSetCookie().some(cookie => cookie.startsWith("psifi.sid=")));
  assert.ok((await csrf.json()).csrfToken);
  for (let i = 0; i < 999; i++) {
    const response = await fetch(base + "/health");
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  }
  for (const path of ["/health", "/csrf-token", "/contact", "/clientportal/api/auth/login",
    "/clientportal/api/projects", "/clientportal/api/konnect/contact",
    "/clientportal/api/analytics/v1/events", "/meandersuite/api/auth/login",
    "/hfssuniformsapp/api/auth/login", "/senior-citz/api/notices", "/unknown.js"]) {
    for (const method of ["GET", "POST", "OPTIONS"]) {
      const response = await fetch(base + path, { method, headers: {
        Origin: "http://localhost:5173", "Content-Type": "application/json",
      }, ...(method === "POST" ? { body: "{" } : {}) });
      assert.equal(response.status, 429, `${method} ${path}`);
      assert.ok(Number(response.headers.get("retry-after")) > 0);
      assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
      assert.equal(response.headers.get("set-cookie"), null);
      assert.match((await response.json()).error, /Too many/);
    }
  }
});

test("localhost proxy forwards all API families and strips spoofed forwarding headers", async t => {
  const upstream = express();
  upstream.use(express.text({ type: "*/*" }));
  upstream.use((req, res) => res.json({ url: req.originalUrl, method: req.method,
    body: req.body, forwarded: req.get("x-forwarded-for"), cookie: req.get("cookie") }));
  const target = await listen(t, upstream);
  const proxy = createFrontendApp({ backendUrl: target });
  const base = await listen(t, proxy);
  for (const path of ["/csrf-token", "/contact", "/clientportal/api/auth/login",
    "/clientportal/api/projects", "/clientportal/api/konnect/contact",
    "/clientportal/api/analytics/v1/events", "/meandersuite/api/auth/login",
    "/hfssuniformsapp/api/auth/login", "/senior-citz/api/notices"]) {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const response = await fetch(base + path + "?test=1", { method,
        headers: { "Content-Type": "text/plain", Cookie: "test=value", "X-Forwarded-For": "198.51.100.9" },
        ...(method === "POST" ? { body: "unchanged" } : {}) });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-security-policy"), /connect-src 'self' http:\/\/localhost:5000 http:\/\/127\.0\.0\.1:5000/);
      const data = await response.json();
      assert.equal(data.url, path + "?test=1");
      assert.equal(data.method, method);
      assert.equal(data.cookie, "test=value");
      assert.notEqual(data.forwarded, "198.51.100.9");
      if (method === "POST") assert.equal(data.body, "unchanged");
    }
  }
  assert.equal(isApiPath("/clientportal/login"), false);
  assert.equal(isApiPath("/senior-citz/apiary"), false);
});

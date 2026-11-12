import assert from "node:assert/strict";
import { before, after, mock, test } from "node:test";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const requireBackend = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
const mongoose = requireBackend("mongoose");
const bcrypt = requireBackend("bcryptjs");
let server, origin, user;
const frontendOrigin = "https://nielseninnovations.com";
const baseHeaders = { Origin: frontendOrigin, "X-Forwarded-Proto": "https" };
const cookieHeader = (response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: "production",
    BACKEND_ENV_FILE: path.resolve("tests/no-local-env"),
    SECRET_KEY: "static-test-session",
    CSRF_SECRET: "static-test-csrf",
    JWT_SECRET: "static-test-jwt",
    RESEND_API_KEY: "re_test_only",
    TRUST_PROXY: "1",
    COOKIE_SAME_SITE: "none",
    TRUSTED_ORIGINS: frontendOrigin,
  });
  const originalConnect = mongoose.createConnection.bind(mongoose);
  mock.method(mongoose, "createConnection", () => originalConnect());
  const { createApp } = await import("../backend/src/app.js");
  const User = (await import("../backend/src/clientportal/models/User.js"))
    .default;
  user = {
    _id: new mongoose.Types.ObjectId(),
    username: "static-client",
    role: "client",
    active: true,
    passwordHash: await bcrypt.hash("Test-only-password-42", 4),
    async save() {},
  };
  mock.method(User, "findOne", async () => user);
  mock.method(User, "findById", () => ({ select: async () => user }));
  server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server?.closeAllConnections();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  mock.restoreAll();
});

test("static frontend signs into the production API directly with secure cookies and CSRF", async () => {
  const preflight = await fetch(origin + "/clientportal/api/auth/login", {
    method: "OPTIONS",
    headers: {
      ...baseHeaders,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,x-csrf-token",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    frontendOrigin,
  );
  assert.equal(
    preflight.headers.get("access-control-allow-credentials"),
    "true",
  );
  const csrf = await fetch(origin + "/csrf-token", { headers: baseHeaders });
  assert.equal(csrf.status, 200);
  const { csrfToken } = await csrf.json();
  assert.equal(csrf.headers.getSetCookie().length, 2);
  for (const cookie of csrf.headers.getSetCookie()) {
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=None/);
  }
  const sessionCookies = cookieHeader(csrf);
  const request = {
    method: "POST",
    headers: {
      ...baseHeaders,
      Cookie: sessionCookies,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: user.username,
      password: "Test-only-password-42",
    }),
  };
  assert.equal(
    (await fetch(origin + "/clientportal/api/auth/login", request)).status,
    403,
  );
  request.headers["X-CSRF-Token"] = csrfToken;
  const login = await fetch(origin + "/clientportal/api/auth/login", request);
  assert.equal(login.status, 200);
  assert.match(cookieHeader(login), /client_portal_session=/);
  assert.match(login.headers.getSetCookie().join(";"), /SameSite=None/);
  assert.match(login.headers.getSetCookie().join(";"), /Secure/);
  const headers = {
    ...baseHeaders,
    Cookie: `${sessionCookies}; ${cookieHeader(login)}`,
  };
  const me = await fetch(origin + "/clientportal/api/auth/me", { headers });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.username, user.username);
  const logout = await fetch(origin + "/clientportal/api/auth/logout", {
    method: "POST",
    headers: { ...headers, "X-CSRF-Token": csrfToken },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.getSetCookie().join(";"), /SameSite=None/);
});

test("Uniform Shop exposes CSRF to the trusted static frontend without readable cross-domain cookies", async () => {
  const response = await fetch(origin + "/hfssuniformsapp/api/csrf-token", {
    headers: baseHeaders,
  });
  assert.equal(response.status, 200);
  const { csrfToken } = await response.json();
  assert.equal(response.headers.get("x-csrf-token"), csrfToken);
  assert.match(
    response.headers.get("access-control-expose-headers"),
    /X-CSRF-Token/,
  );
  for (const cookie of response.headers.getSetCookie()) {
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=None/);
  }
});

test("Render publishes static documents with separate application routes and no start command", () => {
  const blueprint = readFileSync(
    new URL("../render.yaml", import.meta.url),
    "utf8",
  );
  assert.match(blueprint, /runtime: static/);
  assert.match(blueprint, /staticPublishPath: frontend\/dist/);
  assert.doesNotMatch(blueprint, /startCommand:/);
  const rewrites = [
    ...blueprint.matchAll(
      /type: rewrite\s+source: (\S+)\s+destination: \/(\S+)/g,
    ),
  ];
  assert.ok(rewrites.length >= 20);
  for (const [, route, file] of rewrites) {
    assert.ok(
      existsSync(new URL(`../frontend/dist/${file}`, import.meta.url)),
      route,
    );
  }
  for (const [app, document] of [
    ["billing", "billing.html"],
    ["konnect", "konnect.html"],
    ["visitpulse", "visitpulse.html"],
  ]) {
    assert.ok(
      rewrites.some(
        ([, route, file]) =>
          route === `/clientportal/${app}` && file === document,
      ),
    );
  }
  const assets = readFileSync(
    new URL("../frontend/dist/static/react/website.js", import.meta.url),
    "utf8",
  );
  assert.match(assets, /clientportal\/api\/konnect\/contact/);
});

import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import path from "node:path";
import { createFrontendApp } from "../frontend/server/app.js";

const requireBackend = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
const mongoose = requireBackend("mongoose");
const bcrypt = requireBackend("bcryptjs");
let backendServer, frontendServer, backendOrigin, frontendOrigin, User;
const servers = [];

async function listen(app) {
  const server = createServer(app);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

function cookieHeader(response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

before(async () => {
  // Exercise the real HTTP stacks without reading local credentials, connecting
  // to production databases, or sending email. Only persistence is stubbed.
  Object.assign(process.env, {
    NODE_ENV: "test",
    BACKEND_ENV_FILE: path.resolve("tests/no-local-env"),
    SECRET_KEY: "boundary-test-session-secret",
    CSRF_SECRET: "boundary-test-csrf-secret",
    JWT_SECRET: "boundary-test-jwt-secret",
    RESEND_API_KEY: "re_test_only",
    TRUST_PROXY: "loopback",
    TRUSTED_ORIGINS: "http://localhost:5173",
  });
  const originalConnect = mongoose.createConnection.bind(mongoose);
  mock.method(mongoose, "createConnection", () => originalConnect());
  const { createApp } = await import("../backend/src/app.js");
  User = (await import("../backend/src/clientportal/models/User.js")).default;
  ({ server: backendServer, origin: backendOrigin } =
    await listen(createApp()));
  ({ server: frontendServer, origin: frontendOrigin } = await listen(
    createFrontendApp({ backendUrl: backendOrigin }),
  ));
});

after(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  mock.restoreAll();
});

test("frontend owns pages and built assets; backend owns JSON only", async () => {
  for (const route of [
    "/",
    "/clientportal/admin",
    "/clientportal/billing",
    "/clientportal/konnect",
    "/clientportal/visitpulse",
    "/meandersuite/suite",
    "/hfssuniformsapp/pos",
  ]) {
    const response = await fetch(frontendOrigin + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /<div id="root"><\/div>/);
    const apiResponse = await fetch(backendOrigin + route);
    assert.equal(apiResponse.status, 404, route);
    assert.deepEqual(await apiResponse.json(), { error: "Endpoint not found" });
  }
  for (const asset of [
    "/static/react/website.js",
    "/static/react/client-portal.js",
    "/static/react/billing.js",
    "/static/react/konnect.js",
    "/static/react/visitpulse.js",
    "/static/react/hfss-uniforms.js",
    "/static/react/meander-suite.js",
    "/static/main/css/index.css",
    "/favicon.png",
  ]) {
    assert.equal((await fetch(frontendOrigin + asset)).status, 200, asset);
    assert.equal((await fetch(backendOrigin + asset)).status, 404, asset);
  }
  assert.equal((await fetch(frontendOrigin + "/does-not-exist")).status, 404);
  assert.equal(
    (await fetch(frontendOrigin + "/clientportal/api/missing")).status,
    404,
  );
  for (const route of [
    "/.env",
    "/src/backend/server.js",
    "/server/server.js",
  ]) {
    assert.equal((await fetch(frontendOrigin + route)).status, 404);
  }
});

test("fresh sessions can reach protected reads and receive API authentication errors", async () => {
  for (const route of [
    "/clientportal/api/auth/me",
    "/hfssuniformsapp/api/auth/me",
    "/meandersuite/api/suite-data",
  ]) {
    const response = await fetch(frontendOrigin + route);
    assert.equal(response.status, 401, route);
    assert.match(response.headers.get("content-type"), /application\/json/);
  }
});

test("CSRF cookies survive the proxy and mutations require the matching session", async () => {
  const response = await fetch(frontendOrigin + "/csrf-token");
  const { csrfToken } = await response.json();
  const cookies = cookieHeader(response);
  assert.match(cookies, /psifi.sid=/);
  assert.match(cookies, /psifi.x-csrf-token=/);
  const submit = (headers) =>
    fetch(frontendOrigin + "/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: "{}",
    });
  assert.equal((await submit({})).status, 403);
  assert.equal((await submit({ Cookie: cookies })).status, 403);
  assert.equal((await submit({ "X-CSRF-Token": csrfToken })).status, 403);
  assert.equal(
    (await submit({ Cookie: cookies, "X-CSRF-Token": csrfToken })).status,
    400,
  );
});

test("portal login, authenticated reads and logout work across separate servers", async () => {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: "boundary-admin",
    role: "admin",
    active: true,
    passwordHash: await bcrypt.hash("Test-only-password-42", 4),
    async save() {},
  };
  const findOne = mock.method(User, "findOne", async () => user);
  const findById = mock.method(User, "findById", () => ({
    select: async () => user,
  }));
  try {
    const tokenResponse = await fetch(frontendOrigin + "/csrf-token");
    const { csrfToken } = await tokenResponse.json();
    const sessionCookies = cookieHeader(tokenResponse);
    const login = await fetch(frontendOrigin + "/clientportal/api/auth/login", {
      method: "POST",
      headers: {
        Cookie: sessionCookies,
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: user.username,
        password: "Test-only-password-42",
      }),
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).redirectTo, "/clientportal");
    assert.match(login.headers.getSetCookie().join(";"), /Path=\/clientportal/);
    const cookies = `${sessionCookies}; ${cookieHeader(login)}`;
    const me = await fetch(frontendOrigin + "/clientportal/api/auth/me", {
      headers: { Cookie: cookies },
    });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.username, user.username);
    user.role = "client";
    const denied = await fetch(
      frontendOrigin + "/clientportal/api/admin/clients",
      { headers: { Cookie: cookies } },
    );
    assert.equal(denied.status, 403);
    const logout = await fetch(
      frontendOrigin + "/clientportal/api/auth/logout",
      {
        method: "POST",
        headers: { Cookie: cookies, "X-CSRF-Token": csrfToken },
      },
    );
    assert.equal(logout.status, 200);
    assert.equal(cookieHeader(logout), "client_portal_session=");
    assert.match(
      logout.headers.getSetCookie().join(";"),
      /Expires=Thu, 01 Jan 1970/,
    );
  } finally {
    findOne.mock.restore();
    findById.mock.restore();
  }
});

test("uniform shop CSRF remains scoped to its API and browser cookie path", async () => {
  const response = await fetch(
    frontendOrigin + "/hfssuniformsapp/api/csrf-token",
  );
  const { csrfToken } = await response.json();
  const cookies = cookieHeader(response);
  assert.match(
    response.headers.getSetCookie().join(";"),
    /Path=\/hfssuniformsapp/,
  );
  const url = frontendOrigin + "/hfssuniformsapp/api/auth/logout";
  assert.equal((await fetch(url, { method: "POST" })).status, 403);
  assert.equal(
    (
      await fetch(url, {
        method: "POST",
        headers: { Cookie: cookies, "X-CSRF-Token": csrfToken },
      })
    ).status,
    401,
  );
});

test("untrusted browser origins remain blocked through the proxy", async () => {
  for (const route of [
    "/csrf-token",
    "/contact",
    "/clientportal/api/auth/me",
  ]) {
    const response = await fetch(frontendOrigin + route, {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(response.status, 403, route);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
});

test("frontend still serves pages when the backend stops", async () => {
  backendServer.closeAllConnections();
  await new Promise((resolve) => backendServer.close(resolve));
  assert.equal((await fetch(frontendOrigin + "/")).status, 200);
  assert.equal(
    (await fetch(frontendOrigin + "/clientportal/login")).status,
    200,
  );
  assert.equal((await fetch(frontendOrigin + "/health")).status, 200);
  const response = await fetch(frontendOrigin + "/csrf-token");
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /temporarily unavailable/);
});

import test from "node:test";
import assert from "node:assert/strict";

process.env.SECRET_KEY = "senior-test-session-secret";
process.env.CSRF_SECRET = "senior-test-csrf-secret";
process.env.NODE_ENV = "development";
process.env.COOKIE_SAME_SITE = "lax";
process.env.TRUSTED_ORIGINS = "https://sandgate.example";
const { createApp } = await import("../../app.js");
const { seniorCitzDb } = await import("../../shared/config/databases.js");
const { default: Admin } = await import("../models/admin.js");
const { default: Notice } = await import("../models/notice.js");
const { default: Timetable } = await import("../models/timetable.js");

test("Sandgate API: CORS, CSRF, sessions, notices, uploads and timetable", async t => {
  // Exercise the actual combined middleware stack with isolated model doubles.
  const originalState = seniorCitzDb.readyState;
  seniorCitzDb.readyState = 1;
  t.after(() => { seniorCitzDb.readyState = originalState; });
  const id = "507f1f77bcf86cd799439011";
  const admin = { _id: id, username: "admin", validatePassword: async p => p === "correct-password" };
  t.mock.method(Admin, "findOne", async () => admin);
  t.mock.method(Admin, "findById", async () => admin);
  t.mock.method(Admin, "exists", async q => q._id ? { _id: id } : null);
  t.mock.method(Admin, "create", async value => value);
  let notice;
  t.mock.method(Notice, "create", async value => { notice = { ...value, _id: id }; return notice; });
  t.mock.method(Notice, "find", () => ({ sort: async () => notice ? [notice] : [] }));
  t.mock.method(Notice, "findByIdAndUpdate", async (_id, update) => { notice = { ...notice, ...update }; return notice; });
  t.mock.method(Notice, "findByIdAndDelete", async () => { const old = notice; notice = null; return old; });
  t.mock.method(Timetable, "getCurrent", async () => [{ day: "Monday", hours: "9–5", activities: "Bingo" }]);
  t.mock.method(Timetable, "findOneAndUpdate", async (_query, update) => update);
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/senior-citz/api`;
  const cookies = new Map();
  let token;
  async function send(path, { method = "GET", body, origin = "https://sandgate.example", csrf = true } = {}) {
    const headers = { Origin: origin, Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") };
    if (token && csrf) headers["X-CSRF-Token"] = token;
    if (body && !(body instanceof FormData)) { headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
    const response = await fetch(base + path, { method, body, headers });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      cookies.set(pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1));
    }
    return response;
  }
  const refresh = async () => { token = (await (await send("/csrf-token")).json()).csrfToken; };
  assert.equal((await send("/notices", { origin: "https://evil.example" })).status, 403);
  for (const origin of ["https://sandgateseniors.com", "https://www.sandgateseniors.com"]) {
    const response = await send("/notices", { origin });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  }
  const preflight = await send("/admin/notice", { method: "OPTIONS" });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
  assert.deepEqual(await (await send("/notices")).json(), []);
  assert.equal((await send("/timetable")).status, 200);
  assert.equal((await send("/auth/session")).status, 401);
  assert.equal((await send("/admin/login", { method: "POST", body: {} })).status, 403);
  await refresh();
  for (const path of ["/notices", "/admin/notice", "/auth/register"]) {
    assert.equal((await send(path, { method: "POST", body: {} })).status, 401);
  }
  assert.equal((await send("/admin/login", { method: "POST", body: { username: "admin", password: "wrong" } })).status, 401);
  assert.equal((await send("/admin/login", { method: "POST", body: { username: "admin", password: "correct-password" } })).status, 200);
  assert.equal((await send("/auth/session")).status, 200);
  assert.equal((await send("/admin/notice", { method: "POST", body: { title: "Title", content: "Content" } })).status, 403, "login rotates the CSRF session");
  await refresh();
  const form = new FormData();
  form.set("title", "News"); form.set("content", "Welcome");
  form.set("image", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "photo.png");
  assert.equal((await send("/admin/notice", { method: "POST", body: form })).status, 201);
  assert.equal((await (await send("/notices")).json())[0].imageUrl, "data:image/png;base64,iVBORw==");
  assert.equal((await send(`/admin/notice/${id}`, { method: "PUT", body: { title: "Changed", content: "Text" } })).status, 200);
  assert.ok(notice.image, "editing without an image retains the previous image");
  assert.equal((await send("/admin/notice/bad-id", { method: "DELETE" })).status, 400);
  assert.equal((await send("/admin/timetable", { method: "PUT", body: { entries: [null] } })).status, 400);
  assert.equal((await send("/admin/timetable", { method: "PUT", body: { entries: [{ day: "Monday", hours: "9–5", activities: "Bingo" }] } })).status, 200);
  const invalid = new FormData(); invalid.set("image", new Blob(["<svg/>"], { type: "image/svg+xml" }), "bad.svg");
  assert.equal((await send("/admin/notice", { method: "POST", body: invalid })).status, 400);
  const oversized = new FormData(); oversized.set("image", new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" }), "big.png");
  assert.equal((await send("/admin/notice", { method: "POST", body: oversized })).status, 413);
  assert.equal((await send("/auth/register", { method: "POST", body: { username: "new-admin", password: "long-password-123" } })).status, 201);
  assert.equal((await send(`/admin/notice/${id}`, { method: "DELETE" })).status, 200);
  assert.equal((await send(`/admin/notice/${id}`, { method: "DELETE" })).status, 404);
  assert.equal((await send("/admin/logout", { method: "POST" })).status, 200);
  assert.equal((await send("/auth/session")).status, 401);
  seniorCitzDb.readyState = 0;
  assert.equal((await send("/notices")).status, 503);
});

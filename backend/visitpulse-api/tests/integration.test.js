import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { readFile } from "node:fs/promises";
import jwt from "jsonwebtoken";
import { createCollectionRouter } from "../routing/collect.js";
import summaryRouter from "../routing/analytics.js";
import User from "../../main-api/models/User.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import { clientPortalDb } from "../../shared/config/databases.js";
import cookieParser from "cookie-parser";
import { errorHandler } from "../../shared/middleware/errors.js";
import { buildAnalyticsSummary } from "../utils/analytics.js";

const ownerA = "507f1f77bcf86cd799439011";
const ownerB = "507f1f77bcf86cd799439012";
const origin = "https://one.example";
const body = { username: "ownerone", sessionId: "test_session_123456", path: "/hello?secret=1", title: "Hello" };

test("public collection and authenticated reports isolate accounts", async (t) => {
  process.env.VISITPULSE_SITES = JSON.stringify({ ownerone: [origin], ownertwo: ["https://two.example"] });
  process.env.JWT_SECRET = "visitpulse-unit-test-only-secret";
  const rows = [];
  let failStorage = false;
  const app = express();
  app.use("/analytics", createCollectionRouter({
    users: { findOne: ({ username }) => ({ select: async () => username === "ownerone" ? { _id: ownerA, username } : null }) },
    events: { create: async (row) => { if (failStorage) throw new Error("offline"); rows.push(row); } },
    initialise: async () => {},
  }));
  // Avoid all external connections; retain real JWT auth and query-building logic.
  t.mock.method(clientPortalDb, "asPromise", async () => {});
  clientPortalDb.db = { listCollections: () => ({ hasNext: async () => true }) };
  t.mock.method(AnalyticsEvent, "createIndexes", async () => {});
  t.mock.method(User, "findOne", () => ({ select: async () => null }));
  t.mock.method(User, "findById", (id) => ({ select: async () => ({ _id: id, username: id === ownerA ? "ownerone" : "ownertwo", role: "client", active: true }) }));
  t.mock.method(AnalyticsEvent, "find", (query) => {
    assert.ok(query.ownerId, "every summary query must constrain owner");
    const chain = { sort: () => chain, limit: () => chain, select: () => chain,
      lean: async () => rows.filter((row) => row.ownerId === query.ownerId).map(({ ownerId, username, expiresAt, ...row }) => row) };
    return chain;
  });
  app.use(cookieParser());
  app.use("/analytics", summaryRouter);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/analytics`;
  const send = (payload = body, source = origin, extra = {}) => fetch(base + "/v1/events", {
    method: "POST", headers: { "Content-Type": "application/json", ...(source ? { Origin: source } : {}) }, body: JSON.stringify(payload), ...extra,
  });
  let response = await fetch(base + "/v1/events", { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST" } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(response.headers.get("access-control-allow-credentials"), null);
  response = await send();
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(rows[0].ownerId, ownerA);
  assert.equal(rows[0].site, origin);
  assert.equal(rows[0].path, "/hello");
  assert.equal((await send(body, "https://evil.example")).status, 403);
  assert.equal((await send(body, null)).status, 403);
  assert.equal((await send({ ...body, username: "ownertwo" })).status, 403);
  assert.equal((await send({ ...body, username: "ownertwo" }, "https://two.example")).status, 403);
  assert.equal((await send({ ...body, sessionId: "short" })).status, 400);
  assert.equal((await send({ ...body, path: "//evil.example" })).status, 400);
  assert.equal((await send({ ...body, username: { $ne: null } })).status, 400);
  assert.equal((await send({ ...body, title: "a".repeat(5000) })).status, 413);
  assert.equal((await send(body, origin, { body: "{" })).status, 400);
  assert.equal((await send(body, origin, { headers: { Origin: origin, "Content-Type": "text/plain" } })).status, 415);
  failStorage = true;
  assert.equal((await send()).status, 503);
  failStorage = false;
  assert.equal((await fetch(base + "/summary")).status, 401);
  const cookie = (id) => `client_portal_session=${jwt.sign({ sub: id }, process.env.JWT_SECRET)}`;
  response = await fetch(base + "/summary?username=ownertwo", { headers: { Cookie: cookie(ownerA) } });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.totals.pageViews, 1);
  assert.equal(report.recent[0].sessionId, undefined);
  response = await fetch(base + "/summary?username=ownerone", { headers: { Cookie: cookie(ownerB) } });
  assert.equal((await response.json()).totals.pageViews, 0);
  for (let i = 0; i < 60; i++) response = await send();
  assert.equal(response.status, 429);
});

test("sessions are site-scoped and portable tracker stays identical", async () => {
  const events = ["https://one.example", "https://two.example"].map((site) => ({ site, sessionId: "same", path: "/", occurredAt: new Date() }));
  assert.equal(buildAnalyticsSummary(events, 30).totals.visitors, 2);
  const root = new URL("../../../", import.meta.url);
  assert.equal(await readFile(new URL("frontend/src/visitpulse-tracker.js", root), "utf8"), await readFile(new URL("docs/VisitPulse-integration%20pack/visitpulse-tracker.js", root), "utf8"));
});

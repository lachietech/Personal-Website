import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  buildAnalyticsSummary,
  getAnalyticsPayload,
  getAnalyticsStartDate,
} from "../src/backend/clientportal/utils/analytics.js";

test("analytics payload retains only normalized first-party metrics", () => {
  const payload = getAnalyticsPayload(
    {
      sessionId: "1234567890abcdef",
      path: "/services?plan=basic",
      title: "Services",
      referrer: "https://www.google.com/search?q=private-query",
    },
    "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1",
  );

  assert.equal(payload.path, "/services");
  assert.equal(payload.referrer, "www.google.com");
  assert.equal(payload.device, "Mobile");
  assert.equal(payload.browser, "Safari");
  assert.equal("ip" in payload, false);
});

test("analytics payload rejects unsafe paths and session identifiers", () => {
  assert.throws(
    () => getAnalyticsPayload({ sessionId: "short", path: "/" }),
    /session/,
  );
  assert.throws(
    () =>
      getAnalyticsPayload({
        sessionId: "1234567890abcdef",
        path: "https://example.com",
      }),
    /path/,
  );
});

test("analytics reporting periods are allowlisted", () => {
  const now = new Date("2026-08-11T00:00:00.000Z");
  assert.equal(getAnalyticsStartDate(7, now).days, 7);
  assert.equal(getAnalyticsStartDate(365, now).days, 30);
});

test("analytics summaries are built without database-specific operators", () => {
  const summary = buildAnalyticsSummary(
    [
      {
        sessionId: "session-a",
        path: "/",
        referrer: "Direct",
        device: "Desktop",
        browser: "Chrome",
        occurredAt: new Date("2026-08-10T10:00:00.000Z"),
      },
      {
        sessionId: "session-a",
        path: "/services",
        referrer: "Direct",
        device: "Desktop",
        browser: "Chrome",
        occurredAt: new Date("2026-08-10T10:05:00.000Z"),
      },
      {
        sessionId: "session-b",
        path: "/",
        referrer: "google.com",
        device: "Mobile",
        browser: "Safari",
        occurredAt: new Date("2026-08-11T09:00:00.000Z"),
      },
    ],
    7,
  );

  assert.deepEqual(summary.totals, {
    pageViews: 3,
    visitors: 2,
    viewsPerVisitor: 1.5,
  });
  assert.equal(summary.daily.length, 2);
  assert.deepEqual(summary.pages[0], {
    path: "/",
    views: 2,
    visitors: 2,
  });
  assert.equal("sessionId" in summary.recent[0], false);
});

test("trusted analytics date ranges cast correctly with filter sanitizing enabled", () => {
  const previousSetting = mongoose.get("sanitizeFilter");
  mongoose.set("sanitizeFilter", true);
  try {
    const schema = new mongoose.Schema({ occurredAt: Date });
    const Model =
      mongoose.models.AnalyticsDateRangeTest ||
      mongoose.model("AnalyticsDateRangeTest", schema);
    const startDate = new Date("2026-07-15T12:45:34.840Z");
    const query = Model.find({
      occurredAt: mongoose.trusted({ $gte: startDate }),
    });

    query._castConditions();
    assert.equal(query.error(), undefined);
    assert.equal(
      query.getFilter().occurredAt.$gte.getTime(),
      startDate.getTime(),
    );
    assert.equal("$eq" in query.getFilter().occurredAt, false);
  } finally {
    mongoose.set("sanitizeFilter", previousSetting);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
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

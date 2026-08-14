import assert from "node:assert/strict";
import test from "node:test";
import {
  findDangerousKey,
  isTrustedOrigin,
} from "../src/backend/middleware/requestSecurity.js";

test("CORS origin checks use an exact allowlist", () => {
  assert.equal(isTrustedOrigin("https://nielseninnovations.com"), true);
  assert.equal(isTrustedOrigin("https://www.nielseninnovations.com"), true);
  assert.equal(isTrustedOrigin("https://nielseninnovations.com.evil.test"), false);
  assert.equal(isTrustedOrigin("null"), false);
  assert.equal(isTrustedOrigin("javascript:alert(1)"), false);
});

test("MongoDB operators and prototype-pollution keys are rejected", () => {
  assert.equal(findDangerousKey({ username: { $ne: null } }), "$ne");
  assert.equal(findDangerousKey({ "profile.role": "admin" }), "profile.role");
  assert.equal(findDangerousKey({ nested: { constructor: {} } }), "constructor");
  assert.equal(findDangerousKey({ username: "safe", rows: [{ amount: 12 }] }), null);
});

test("excessively deep request structures are rejected", () => {
  let payload = {};
  let cursor = payload;
  for (let index = 0; index < 15; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }
  assert.equal(findDangerousKey(payload), "request structure");
});

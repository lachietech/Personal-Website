import assert from "node:assert/strict";
import { test } from "node:test";
import { cookieSettings } from "../src/config/cookies.js";

test("separate production API hosts use secure cross-site cookies", () => {
  assert.deepEqual(cookieSettings({ NODE_ENV: "production" }), {
    sameSite: "none",
    secure: true,
  });
  assert.deepEqual(cookieSettings({ NODE_ENV: "development" }), {
    sameSite: "strict",
    secure: false,
  });
  assert.deepEqual(
    cookieSettings({ NODE_ENV: "production", COOKIE_SAME_SITE: "strict" }),
    { sameSite: "strict", secure: true },
  );
  assert.deepEqual(cookieSettings({ COOKIE_SAME_SITE: "none" }), {
    sameSite: "none",
    secure: true,
  });
  assert.throws(() => cookieSettings({ COOKIE_SAME_SITE: "invalid" }));
});

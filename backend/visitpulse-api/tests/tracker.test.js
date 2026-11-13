import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../../../frontend/src/visitpulse-tracker.js", import.meta.url), "utf8")).replace("export function", "function");
function browser(overrides = {}) {
  const calls = [];
  const callbacks = [];
  const sandbox = {
    URL, location: { origin: "https://example.com", pathname: "/hello" },
    document: { readyState: "loading", title: "Hello", referrer: "https://search.example/private?q=secret" },
    navigator: {}, crypto: { randomUUID: () => "12345678-1234-1234-1234-123456789abc" },
    sessionStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } },
    window: { addEventListener: (_event, callback) => callbacks.push(callback) },
    fetch: async (url, options) => { calls.push({ url, ...options }); return { ok: true }; },
    ...overrides,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const tracker = sandbox.createVisitPulse({ username: "exampleuser", endpoint: "https://api.example/events" });
  return { tracker, calls, callbacks, sandbox };
}

test("tracker waits for load once, omits credentials and strips sensitive URL parts", async () => {
  const { tracker, calls, callbacks } = browser();
  tracker.start(); tracker.start();
  assert.equal(callbacks.length, 1);
  assert.equal(calls.length, 0);
  callbacks[0]();
  await tracker.trackPageView({ path: "/next?private=1#secret" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].credentials, "omit");
  const first = JSON.parse(calls[0].body), second = JSON.parse(calls[1].body);
  assert.equal(first.referrer, "https://search.example");
  assert.equal(second.path, "/next");
  assert.equal(first.sessionId, second.sessionId);
});

test("privacy preferences and network failure are nonfatal", async () => {
  for (const navigator of [{ globalPrivacyControl: true }, { doNotTrack: "1" }]) {
    const { tracker, calls } = browser({ navigator });
    assert.equal(await tracker.trackPageView(), false);
    assert.equal(calls.length, 0);
  }
  const { tracker } = browser({ fetch: async () => { throw new Error("offline"); } });
  assert.equal(await tracker.trackPageView(), false);
  const ssr = browser({ window: undefined });
  ssr.tracker.start();
  assert.equal(await ssr.tracker.trackPageView(), false);
});

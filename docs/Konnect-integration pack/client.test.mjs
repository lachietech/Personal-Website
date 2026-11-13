import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("./konnect-client.js", import.meta.url), "utf8");
const { createKonnectClient, KonnectError } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const endpoint = "https://api.example/clientportal/api/konnect/contact";
const fields = { name: "Alex", email: "alex@example.com", subject: "Test", message: "Hello" };
const response = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test("single recipient submission omits credentials and ignores visitor recipient overrides", async () => {
  const requests = [];
  const client = createKonnectClient({ endpoint, username: "ExampleUser", fetchImpl: async (url, options) => {
    requests.push({ url, ...options });
    return response(201, { success: true, message: "Delivered" });
  }});
  assert.deepEqual(await client.submit({ ...fields, username: "attacker", extra: "ignored" }), { success: true, message: "Delivered" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, endpoint);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].credentials, "omit");
  assert.deepEqual(requests[0].headers, { "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(requests[0].body), { username: "exampleuser", ...fields, website: "" });
});

test("multiple recipients are normalized, deduplicated and copied", async () => {
  const usernames = ["Owner.One", "owner.one", "owner.two"];
  let sent;
  const client = createKonnectClient({ endpoint, usernames, fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    return response(201, { success: true });
  }});
  usernames.push("not.configured");
  await client.submit(fields);
  assert.deepEqual(sent.usernames, ["owner.one", "owner.two"]);
  assert.equal(sent.username, undefined);
});

test("invalid endpoint and recipient configuration fail before sending", () => {
  for (const config of [{}, { username: "short name" }, { usernames: [] }, { username: "valid", usernames: ["valid"] }, { usernames: Array(21).fill("valid") }]) {
    assert.throws(() => createKonnectClient({ endpoint, ...config }));
  }
  for (const url of ["javascript:alert(1)", "https://user:secret@example.com/contact", "https://example.com/contact#hash"]) {
    assert.throws(() => createKonnectClient({ endpoint: url, username: "valid" }));
  }
});

test("API rejection and rate-limit guidance are preserved without retry", async () => {
  let calls = 0;
  const client = createKonnectClient({ endpoint, username: "valid", fetchImpl: async () => {
    calls++;
    return response(429, { error: "Too many messages" }, { "Retry-After": "60" });
  }});
  await assert.rejects(client.submit(fields), (error) => error instanceof KonnectError && error.status === 429 && error.retryAfter === 60 && !error.deliveryUnknown);
  assert.equal(calls, 1);
});

test("network failures and malformed success responses report uncertain delivery", async () => {
  for (const fetchImpl of [
    async () => { throw new TypeError("offline"); },
    async () => new Response("not JSON", { status: 201 }),
    async () => response(500, { error: "Storage unavailable" }),
  ]) {
    let calls = 0;
    const client = createKonnectClient({ endpoint, username: "valid", fetchImpl: (...args) => { calls++; return fetchImpl(...args); } });
    await assert.rejects(client.submit(fields), (error) => error instanceof KonnectError && error.deliveryUnknown);
    assert.equal(calls, 1);
  }
});

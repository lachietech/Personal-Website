import assert from "node:assert/strict";
import { before, after, mock, test } from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { createServer } from "node:http";
import { createFrontendApp } from "../frontend/server/app.js";

const requireBackend = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
const mongoose = requireBackend("mongoose");
const servers = [];
const users = [
  {
    _id: "507f1f77bcf86cd799439011",
    username: "admin",
    role: "admin",
    active: true,
  },
  {
    _id: "507f1f77bcf86cd799439012",
    username: "client.one",
    role: "client",
    active: true,
  },
  {
    _id: "507f1f77bcf86cd799439013",
    username: "client.two",
    role: "client",
    active: true,
  },
  {
    _id: "507f1f77bcf86cd799439014",
    username: "disabled",
    role: "client",
    active: false,
  },
  {
    _id: "507f1f77bcf86cd799439015",
    username: "nielseninnovations",
    role: "client",
    active: true,
  },
];
const messages = [];
let origin, authToken, Message;
let requestNumber = 0;
let failWrites = false;
const contact = {
  name: "Alex Morgan",
  email: "alex@example.com",
  subject: "Website enquiry",
  message: "Please tell me more.",
};

// Only persistence is substituted. Requests still traverse both real services,
// their authentication, CSRF, CORS, validation and routing middleware.
function matches(record, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((part) => matches(record, part));
    const actual = key
      .split(".")
      .reduce((item, field) => item?.[field], record);
    if (value?.$elemMatch)
      return actual.some((item) => matches(item, value.$elemMatch));
    if (value?.$in) return value.$in.map(String).includes(String(actual));
    if (value?.$regex !== undefined)
      return new RegExp(value.$regex, value.$options).test(actual);
    return (
      (actual == null && value == null) || String(actual) === String(value)
    );
  });
}
function query(value) {
  let result = value;
  return {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip(count) {
      result = result.slice(count);
      return this;
    },
    limit(count) {
      result = result.slice(0, count);
      return this;
    },
    lean() {
      return Promise.resolve(result);
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}
async function listen(handler) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
before(async () => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    BACKEND_ENV_FILE: path.resolve("tests/no-local-env"),
    SECRET_KEY: "konnect-test-session",
    CSRF_SECRET: "konnect-test-csrf",
    JWT_SECRET: "konnect-test-jwt",
    RESEND_API_KEY: "re_test_only",
    TRUST_PROXY: "loopback",
  });
  const originalConnect = mongoose.createConnection.bind(mongoose);
  mock.method(mongoose, "createConnection", () => originalConnect());
  const { createApp } = await import("../backend/src/app.js");
  const User = (await import("../backend/src/clientportal/models/User.js"))
    .default;
  Message = (
    await import("../backend/src/clientportal/models/KonnectMessage.js")
  ).default;
  authToken = (await import("../backend/src/clientportal/middleware/auth.js"))
    .createPortalToken;
  mock.method(User, "find", (filter) =>
    query(users.filter((user) => matches(user, filter))),
  );
  mock.method(
    User,
    "countDocuments",
    async (filter) => users.filter((user) => matches(user, filter)).length,
  );
  mock.method(User, "findById", (id) =>
    query(users.find((user) => user._id === String(id))),
  );
  mock.method(Message, "create", async (payload) => {
    if (failWrites) throw new Error("Simulated database outage");
    const record = new Message(payload);
    await record.validate();
    const result = record.toObject();
    result.createdAt = new Date();
    messages.push(result);
    return result;
  });
  mock.method(Message, "find", (filter) =>
    query(messages.filter((message) => matches(message, filter))),
  );
  mock.method(
    Message,
    "countDocuments",
    async (filter) =>
      messages.filter((message) => matches(message, filter)).length,
  );
  mock.method(Message, "findOne", (filter) =>
    query(messages.find((message) => matches(message, filter))),
  );
  mock.method(Message, "findOneAndUpdate", (filter, update) => {
    const message = messages.find((item) => matches(item, filter));
    if (message) {
      const delivery = message.recipients.find(
        (item) =>
          String(item.userId) === String(filter.recipients.$elemMatch.userId),
      );
      for (const [key, value] of Object.entries(update.$set))
        delivery[key.split(".").at(-1)] = value;
    }
    return query(message);
  });
  const backendUrl = await listen(createApp());
  origin = await listen(
    createFrontendApp({ backendUrl, trustProxy: "loopback" }),
  );
});
after(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  mock.restoreAll();
});
function submit(source, payload, websiteOrigin, ip) {
  const route = source === "contact" ? "contact" : `forms/${source}/messages`;
  return fetch(`${origin}/clientportal/api/konnect/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": ip || `198.51.100.${++requestNumber}`,
      ...(websiteOrigin === undefined ? {} : { Origin: websiteOrigin }),
    },
    body: JSON.stringify(payload),
  });
}
async function credentials(user) {
  const response = await fetch(origin + "/csrf-token");
  const { csrfToken } = await response.json();
  return {
    Cookie:
      response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ") + `; client_portal_session=${authToken(user)}`,
    "X-CSRF-Token": csrfToken,
    "Content-Type": "application/json",
  };
}

test("main website enquiries go only to nielseninnovations, without requiring an admin role", async () => {
  const response = await submit(
    "contact",
    { ...contact, username: "nielseninnovations" },
    "https://nielseninnovations.com",
  );
  assert.equal(response.status, 201);
  assert.equal(response.headers.getSetCookie().length, 0);
  assert.equal(messages.length, 1);
  assert.deepEqual(
    messages[0].recipients.map((item) => String(item.userId)),
    [users[4]._id],
  );
  assert.equal(messages[0].body, contact.message);
});
test("main website rejects attempts to redirect enquiries to another account", async () => {
  const response = await submit(
    "website",
    { ...contact, usernames: ["admin"] },
    "https://nielseninnovations.com",
  );
  assert.equal(response.status, 400);
  assert.equal(messages.length, 1);
});
test("external websites route only to the usernames in their API request", async () => {
  const response = await submit("contact", {
    ...contact,
    username: "CLIENT.ONE",
  });
  assert.equal(response.status, 201);
  assert.deepEqual(
    messages[1].recipients.map((item) => String(item.userId)),
    [users[1]._id],
  );
  assert.equal(messages[1].origin, "");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  const multi = await submit(
    "client-site",
    { ...contact, usernames: ["client.one", "client.two"] },
    "https://never-registered.example",
  );
  assert.equal(multi.status, 201);
  assert.equal(messages[2].recipients.length, 2);
});
test("missing, mixed invalid, nonexistent and disabled recipients never cause partial or fallback delivery", async () => {
  const beforeCount = messages.length;
  for (const usernames of [
    undefined,
    ["client.one", "not-a-user"],
    ["not-a-user"],
    ["disabled"],
  ]) {
    const response = await submit(
      "client-site",
      { ...contact, ...(usernames ? { usernames } : {}) },
      "https://never-registered.example",
    );
    assert.equal(response.status, 400);
  }
  assert.equal(messages.length, beforeCount);
});
test("public CORS accepts arbitrary and absent origins without cookie authority", async () => {
  const url = origin + "/clientportal/api/konnect/contact";
  for (const requestOrigin of [
    "https://unregistered.example",
    "null",
    undefined,
  ]) {
    const response = await fetch(url, {
      method: "OPTIONS",
      headers: {
        ...(requestOrigin === undefined ? {} : { Origin: requestOrigin }),
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(
      response.headers.get("access-control-allow-credentials"),
      null,
    );
    assert.equal(response.headers.getSetCookie().length, 0);
  }
});

test("a database write failure is never reported as successful delivery", async () => {
  failWrites = true;
  try {
    const response = await submit(
      "website",
      contact,
      "https://nielseninnovations.com",
    );
    assert.equal(response.status, 500);
    assert.equal(messages.length, 3);
  } finally {
    failWrites = false;
  }
});

test("an inactive nielseninnovations account fails without falling back to administrators", async () => {
  users[4].active = false;
  try {
    const response = await submit(
      "website",
      { ...contact, usernames: ["nielseninnovations"] },
      "https://nielseninnovations.com",
    );
    assert.equal(response.status, 503);
    assert.equal(messages.length, 3);
  } finally {
    users[4].active = true;
  }
});

test("mailbox search treats query characters literally and validates folders", async () => {
  const headers = await credentials(users[1]);
  const url = origin + "/clientportal/api/konnect/messages";
  const literal = await fetch(url + "?q=Website%20enquiry", { headers });
  assert.equal((await literal.json()).total, 2);
  const expression = await fetch(url + "?q=Website.*", { headers });
  assert.equal((await expression.json()).total, 0);
  assert.equal(
    (await fetch(url + "?folder=another-user", { headers })).status,
    400,
  );
});
test("a recipient sees only their own deliveries, even when an administrator knows a message ID", async () => {
  const ownHeaders = await credentials(users[1]);
  const list = await fetch(origin + "/clientportal/api/konnect/messages", {
    headers: ownHeaders,
  });
  assert.equal(list.status, 200);
  const result = await list.json();
  assert.equal(result.total, 2);
  assert.equal(result.messages[0].recipients, undefined);
  const id = messages[1]._id;
  const url = origin + `/clientportal/api/konnect/messages/${id}`;
  for (const user of [users[0], users[2]]) {
    const headers = await credentials(user);
    assert.equal((await fetch(url, { headers })).status, 404);
    assert.equal(
      (
        await fetch(url, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ read: true }),
        })
      ).status,
      404,
    );
  }
  assert.equal((await fetch(url, { headers: ownHeaders })).status, 200);
});
test("read, starred and archive state is independent for every recipient and protected by CSRF", async () => {
  const headers = await credentials(users[1]);
  const url = origin + `/clientportal/api/konnect/messages/${messages[2]._id}`;
  assert.equal(
    (
      await fetch(url, {
        method: "PATCH",
        headers: { Cookie: headers.Cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      })
    ).status,
    403,
  );
  const response = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ read: true, starred: true, archived: true }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).message.archived, true);
  assert.equal(messages[2].recipients[0].starred, true);
  assert.equal(messages[2].recipients[1].starred, false);
  assert.equal(messages[2].recipients[1].readAt, null);
  assert.equal(messages[2].recipients[1].archived, false);
  const inbox = await fetch(
    origin + "/clientportal/api/konnect/messages?folder=inbox",
    { headers },
  );
  assert.equal((await inbox.json()).total, 1);
  const archive = await fetch(
    origin + "/clientportal/api/konnect/messages?folder=archive",
    { headers },
  );
  assert.equal((await archive.json()).total, 1);
});
test("message content and replies cannot be written through the mailbox API", async () => {
  const headers = await credentials(users[1]);
  const url = origin + `/clientportal/api/konnect/messages/${messages[1]._id}`;
  assert.equal(
    (
      await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ body: "Overwrite content" }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(url + "/reply", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: "Reply" }),
      })
    ).status,
    404,
  );
  assert.equal(messages[1].body, contact.message);
});
test("form registration endpoints are removed even for administrators", async () => {
  const headers = await credentials(users[0]);
  const url = origin + "/clientportal/api/konnect/sources";
  assert.equal((await fetch(url, { headers })).status, 404);
  assert.equal(
    (
      await fetch(url + "/client-site", {
        method: "PUT",
        headers,
        body: JSON.stringify({ enabled: false }),
      })
    ).status,
    404,
  );
});

test("legacy contact submissions without usernames reach only nielseninnovations", async () => {
  const csrfResponse = await fetch(origin + "/csrf-token");
  const { csrfToken } = await csrfResponse.json();
  const response = await fetch(origin + "/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Cookie: csrfResponse.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; "),
    },
    body: JSON.stringify(contact),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.deepEqual(
    messages.at(-1).recipients.map((item) => String(item.userId)),
    [users[4]._id],
  );
});

test("unregistered origins can deliver directly to active usernames without source configuration", async () => {
  const response = await submit(
    "contact",
    { ...contact, username: "admin" },
    "https://brand-new.example",
  );
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("access-control-allow-credentials"), null);
  assert.equal(response.headers.getSetCookie().length, 0);
  assert.deepEqual(
    messages.at(-1).recipients.map((item) => String(item.userId)),
    [users[0]._id],
  );
  assert.equal(messages.at(-1).origin, "https://brand-new.example");
});

test("public intake keeps validation, JSON limits and authentication boundaries", async () => {
  const beforeCount = messages.length;
  const url = origin + "/clientportal/api/konnect/contact";
  for (const body of [
    { ...contact, username: "client.one", usernames: ["client.two"] },
    { ...contact, username: { $ne: null } },
    { ...contact, username: "client.one", extra: true },
  ])
    assert.equal((await submit("contact", body)).status, 400);
  const oversize = await submit("contact", {
    ...contact,
    username: "client.one",
    message: "x".repeat(17000),
  });
  assert.equal(oversize.status, 413);
  assert.equal(oversize.headers.get("access-control-allow-origin"), "*");
  const nonJson = await fetch(url, { method: "POST", body: "hello" });
  assert.equal(nonJson.status, 415);
  assert.equal((await fetch(url)).status, 405);
  assert.equal(
    (await fetch(origin + "/clientportal/api/konnect/messages")).status,
    401,
  );
  const foreignMailbox = await fetch(
    origin + "/clientportal/api/konnect/messages",
    {
      headers: { Origin: "https://brand-new.example" },
    },
  );
  assert.equal(foreignMailbox.status, 403);
  assert.notEqual(
    foreignMailbox.headers.get("access-control-allow-origin"),
    "*",
  );
  assert.equal(messages.length, beforeCount);
});

test("rate limits apply across canonical and compatibility intake URLs", async () => {
  const beforeCount = messages.length;
  for (let i = 0; i < 10; i++) {
    const response = await submit(
      i % 2 ? "unregistered" : "contact",
      {
        ...contact,
        username: "client.one",
        website: "bot",
      },
      undefined,
      "203.0.113.200",
    );
    assert.equal(response.status, 201);
  }
  const limited = await submit(
    "contact",
    { ...contact, username: "client.one" },
    undefined,
    "203.0.113.200",
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("access-control-allow-origin"), "*");
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(messages.length, beforeCount);
});

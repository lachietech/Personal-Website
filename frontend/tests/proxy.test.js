import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { createFrontendApp } from "../server/app.js";

const servers = [];
let origin;
async function listen(handler) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
before(async () => {
  const backendUrl = await listen(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.url.endsWith("/download")) {
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="receipt.pdf"',
      });
      return res.end(Buffer.from([0, 1, 2, 255, 128]));
    }
    res.writeHead(201, {
      "Content-Type": "application/json",
      "Set-Cookie": [
        "session=abc; Path=/; HttpOnly; Secure; SameSite=Strict",
        "token=xyz; Path=/clientportal; SameSite=Strict",
      ],
    });
    res.end(
      JSON.stringify({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: Buffer.concat(chunks).toString(),
      }),
    );
  });
  origin = await listen(createFrontendApp({ backendUrl }));
});
after(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("proxy preserves multipart uploads, queries, cookies and API status", async () => {
  const body = new FormData();
  body.set(
    "receipt",
    new Blob(["receipt-content"], { type: "application/pdf" }),
    "receipt.pdf",
  );
  const response = await fetch(
    `${origin}/clientportal/api/upload?name=a%2Fb&sort=desc`,
    {
      method: "POST",
      body,
      headers: {
        Cookie: "session=client-cookie",
        "X-CSRF-Token": "csrf-value",
        Origin: "https://nielseninnovations.com",
      },
    },
  );
  assert.equal(response.status, 201);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.match(
    response.headers.getSetCookie()[0],
    /HttpOnly; Secure; SameSite=Strict/,
  );
  const echoed = await response.json();
  assert.equal(echoed.url, "/clientportal/api/upload?name=a%2Fb&sort=desc");
  assert.equal(echoed.method, "POST");
  assert.equal(echoed.headers.cookie, "session=client-cookie");
  assert.equal(echoed.headers["x-csrf-token"], "csrf-value");
  assert.equal(echoed.headers.origin, "https://nielseninnovations.com");
  assert.match(
    echoed.headers["content-type"],
    /multipart\/form-data; boundary=/,
  );
  assert.match(echoed.body, /receipt-content/);
  assert.match(echoed.body, /filename="receipt.pdf"/);
});

test("proxy streams binary attachments without changing their bytes", async () => {
  const response = await fetch(origin + "/clientportal/api/download");
  assert.equal(
    response.headers.get("content-disposition"),
    'attachment; filename="receipt.pdf"',
  );
  assert.deepEqual(
    Buffer.from(await response.arrayBuffer()),
    Buffer.from([0, 1, 2, 255, 128]),
  );
});

test("proxy replaces untrusted forwarding headers", async () => {
  const response = await fetch(origin + "/csrf-token/", {
    headers: {
      "X-Forwarded-For": "203.0.113.20",
      "X-Forwarded-Proto": "https",
      "X-Forwarded-Host": "evil.example",
      Forwarded: "for=203.0.113.20;proto=https",
    },
  });
  const { headers } = await response.json();
  assert.equal(headers["x-forwarded-for"], "127.0.0.1");
  assert.equal(headers["x-forwarded-proto"], "http");
  assert.equal(headers["x-forwarded-host"], new URL(origin).host);
  assert.equal(headers.forwarded, undefined);
});

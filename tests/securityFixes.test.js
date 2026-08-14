import assert from "node:assert/strict";
import test from "node:test";
import { hasAllowedReceiptSignature } from "../src/backend/clientportal/utils/multipart.js";
import { protectFromCsrf } from "../src/backend/middleware/csrf.js";
import { getObjectId } from "../src/backend/middleware/databaseInput.js";
import {
  enforceTrustedOrigins,
  getTrustedOrigin,
} from "../src/backend/middleware/requestSecurity.js";

function createResponseRecorder() {
  return {
    body: null,
    headers: new Map(),
    statusCode: 200,
    vary() {},
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    sendStatus(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

test("credentialed CORS accepts only exact server allowlist members", () => {
  const response = createResponseRecorder();
  let continued = false;
  const request = {
    method: "GET",
    path: "/clientportal/api/client/dashboard",
    get(name) {
      return name === "origin" ? "https://nielseninnovations.com" : undefined;
    },
  };

  enforceTrustedOrigins(request, response, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    getTrustedOrigin("https://nielseninnovations.com"),
  );
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");

  const rejectedResponse = createResponseRecorder();
  let rejectedRequestContinued = false;
  enforceTrustedOrigins(
    {
      method: "GET",
      path: "/clientportal/api/client/dashboard",
      get(name) {
        return name === "origin"
          ? "https://nielseninnovations.com.evil.test"
          : undefined;
      },
    },
    rejectedResponse,
    () => {
      rejectedRequestContinued = true;
    },
  );

  assert.equal(rejectedRequestContinued, false);
  assert.equal(rejectedResponse.statusCode, 403);
  assert.equal(
    rejectedResponse.headers.has("access-control-allow-origin"),
    false,
  );
  assert.equal(
    rejectedResponse.headers.has("access-control-allow-credentials"),
    false,
  );
});

test("CSRF middleware rejects sessions that never initialized a token", () => {
  const response = createResponseRecorder();
  let continued = false;

  protectFromCsrf(
    { path: "/clientportal/api/auth/login", session: {} },
    response,
    () => {
      continued = true;
    },
  );

  assert.equal(continued, false);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: "Invalid CSRF token" });
});

test("database ids must be literal 24-character hexadecimal strings", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.equal(getObjectId(id).toHexString(), id);
  assert.equal(getObjectId({ toString: () => id }), null);
  assert.equal(getObjectId({ $ne: null }), null);
  assert.equal(getObjectId("not-an-object-id"), null);
});

test("receipt signatures use fixed dispatch for each allowed content type", () => {
  assert.equal(
    hasAllowedReceiptSignature("application/pdf", Buffer.from("%PDF-1.7")),
    true,
  );
  assert.equal(
    hasAllowedReceiptSignature("image/jpeg", Buffer.from([0xff, 0xd8, 0xff])),
    true,
  );
  assert.equal(
    hasAllowedReceiptSignature(
      "image/png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    true,
  );
  assert.equal(
    hasAllowedReceiptSignature(
      "image/webp",
      Buffer.from("RIFF0000WEBP", "ascii"),
    ),
    true,
  );
  assert.equal(
    hasAllowedReceiptSignature("toString", Buffer.from("anything")),
    false,
  );
  assert.equal(
    hasAllowedReceiptSignature("application/pdf", Buffer.from("not a PDF")),
    false,
  );
});

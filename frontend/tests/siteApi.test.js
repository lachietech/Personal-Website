import assert from "node:assert/strict";
import { test } from "node:test";
import { sendContactMessage } from "../src/apps/website/api/siteApi.js";

test("homepage submits to Konnect with only the nielseninnovations recipient", async (t) => {
  const contact = {
    name: "Alex",
    email: "alex@example.com",
    subject: "Hello",
    message: "An enquiry",
    usernames: ["another-user"],
  };
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/clientportal/api/konnect/contact");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "omit");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), {
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      username: "nielseninnovations",
    });
    return Response.json({ success: true }, { status: 201 });
  });
  assert.deepEqual(await sendContactMessage(contact), { success: true });
  assert.equal(fetchMock.mock.callCount(), 1);
});

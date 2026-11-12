import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  contactPayload,
  deliveryFilter,
  serializeMessage,
  statePatch,
} from "../src/clientportal/utils/konnect.js";

const first = "507f1f77bcf86cd799439011";
const second = "507f1f77bcf86cd799439012";
const contact = {
  name: " Alex ",
  email: "ALEX@example.com",
  subject: "A question",
  message: "Hello",
  usernames: ["Client.One", "client.one", "client.two"],
};
test("contact requests normalize and deduplicate recipient usernames", () => {
  const result = contactPayload(contact);
  assert.deepEqual(result.usernames, ["client.one", "client.two"]);
  assert.equal(result.sender.name, "Alex");
  assert.equal(result.sender.email, "alex@example.com");
  for (const usernames of [[], "admin", [{ $ne: null }], ["x"], ["<script>"]])
    assert.throws(() => contactPayload({ ...contact, usernames }));
  assert.throws(() => contactPayload({ ...contact, recipientIds: [first] }));
  assert.throws(() =>
    contactPayload({ ...contact, message: "x".repeat(4001) }),
  );
});
test("single usernames normalize and ambiguous or missing recipients are rejected", () => {
  const { usernames, ...fields } = contact;
  assert.deepEqual(
    contactPayload({ ...fields, username: "CLIENT.ONE" }).usernames,
    ["client.one"],
  );
  assert.throws(() => contactPayload(fields));
  assert.throws(() => contactPayload({ ...contact, username: "client.one" }));
  for (const username of [null, [], {}, "", "x", "<script>"])
    assert.throws(() => contactPayload({ ...fields, username }));
  assert.deepEqual(
    contactPayload(fields, { allowMissingRecipient: true }).usernames,
    [],
  );
});
test("folder filters bind every state condition to the same recipient element", () => {
  const filter = deliveryFilter(first, "unread");
  mongoose.sanitizeFilter(filter);
  assert.equal(filter.recipients.$elemMatch.userId.toString(), first);
  assert.equal(filter.recipients.$elemMatch.archived, false);
  assert.equal(filter.recipients.$elemMatch.readAt, null);
  assert.equal(filter.recipients.$eq, undefined);
  assert.throws(() => deliveryFilter(first, "other-user"));
});
test("message responses reveal only the caller's delivery state", () => {
  const message = {
    _id: first,
    sender: { name: "Alex", email: "alex@example.com" },
    subject: "Private enquiry",
    body: "Full\nmessage",
    sourceKey: "website",
    sourceName: "Website",
    createdAt: new Date(),
    recipients: [
      { userId: first, readAt: null, starred: true, archived: false },
      { userId: second, readAt: new Date(), starred: false, archived: true },
    ],
  };
  const response = serializeMessage(message, first);
  assert.equal(response.read, false);
  assert.equal(response.starred, true);
  assert.equal(response.archived, false);
  assert.equal(response.preview, "Full message");
  assert.equal(response.recipients, undefined);
  assert.equal(response.body, undefined);
  assert.equal(serializeMessage(message, second, true).body, "Full\nmessage");
  assert.throws(() => serializeMessage(message, "507f1f77bcf86cd799439013"));
});
test("updates allow only personal mailbox state, never message content or replies", () => {
  assert.deepEqual(
    statePatch({ read: false, starred: true, archived: false }),
    {
      "recipients.$.readAt": null,
      "recipients.$.starred": true,
      "recipients.$.archived": false,
    },
  );
  for (const body of [
    null,
    [],
    {},
    { read: "true" },
    { body: "Changed" },
    { reply: "Hello" },
    { userId: second },
    { recipients: [] },
  ])
    assert.throws(() => statePatch(body));
});

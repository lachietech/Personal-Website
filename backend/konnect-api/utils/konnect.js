import mongoose from "mongoose";
import {
  InputError,
  getEmail,
  getMessage,
  getRequiredString,
} from "../../shared/utils/security.js";
import { getObjectId } from "../../shared/middleware/databaseInput.js";

export function contactPayload(
  body = {},
  { allowMissingRecipient = false } = {},
) {
  const allowed = new Set([
    "name",
    "email",
    "subject",
    "message",
    "username",
    "usernames",
    "website",
  ]);
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !allowed.has(key))
  )
    throw new InputError("Unsupported contact fields");
  if (body.username !== undefined && body.usernames !== undefined)
    throw new InputError("Use username or usernames, not both");
  const recipients =
    body.username !== undefined ? [body.username] : body.usernames;
  let usernames = [];
  if (recipients !== undefined) {
    if (
      !Array.isArray(recipients) ||
      !recipients.length ||
      recipients.length > 20 ||
      recipients.some(
        (value) =>
          typeof value !== "string" || !/^[a-z0-9._-]{3,32}$/i.test(value),
      )
    )
      throw new InputError("usernames must contain 1 to 20 portal usernames");
    usernames = [...new Set(recipients.map((value) => value.toLowerCase()))];
  }
  if (!allowMissingRecipient && !usernames.length)
    throw new InputError("Include a recipient username in the contact request");
  if (body.website !== undefined && typeof body.website !== "string")
    throw new InputError("Invalid website field");
  return {
    sender: {
      name: getRequiredString(body.name, "Name", 120),
      email: getEmail(body.email),
    },
    subject: getRequiredString(body.subject, "Subject", 160),
    body: getMessage(body.message),
    usernames,
    honeypot: Boolean(body.website),
  };
}

export function deliveryFilter(userId, folder = "inbox") {
  if (!["inbox", "unread", "starred", "archive", "all"].includes(folder))
    throw new InputError("Unknown mailbox folder");
  const delivery = { userId: getObjectId(userId) };
  if (!delivery.userId) throw new InputError("Invalid mailbox user");
  if (folder === "inbox" || folder === "unread") delivery.archived = false;
  if (folder === "unread") delivery.readAt = null;
  if (folder === "starred") delivery.starred = true;
  if (folder === "archive") delivery.archived = true;
  return { recipients: mongoose.trusted({ $elemMatch: delivery }) };
}

export function statePatch(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new InputError("Invalid message update");
  const keys = Object.keys(body);
  if (
    !keys.length ||
    keys.some(
      (key) =>
        !["read", "starred", "archived"].includes(key) ||
        typeof body[key] !== "boolean",
    )
  )
    throw new InputError(
      "Only read, starred and archived boolean fields can be changed",
    );
  const update = {};
  if ("read" in body)
    update["recipients.$.readAt"] = body.read ? new Date() : null;
  if ("starred" in body) update["recipients.$.starred"] = body.starred;
  if ("archived" in body) update["recipients.$.archived"] = body.archived;
  return update;
}

export function serializeMessage(message, userId, includeBody = false) {
  const delivery = message.recipients.find(
    (item) => String(item.userId) === String(userId),
  );
  if (!delivery) throw new Error("Message has no delivery for this user");
  return {
    id: String(message._id),
    sender: message.sender,
    subject: message.subject,
    preview: message.body.replace(/\s+/g, " ").slice(0, 160),
    source: {
      key: message.sourceKey,
      name: message.sourceName,
      origin: message.origin,
    },
    createdAt: message.createdAt,
    read: Boolean(delivery.readAt),
    starred: delivery.starred,
    archived: delivery.archived,
    ...(includeBody ? { body: message.body } : {}),
  };
}

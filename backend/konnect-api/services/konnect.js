import mongoose from "mongoose";
import Message from "../models/KonnectMessage.js";
import User from "../../main-api/models/User.js";
import { InputError } from "../../shared/utils/security.js";

export const WEBSITE_RECIPIENT_USERNAME = "nielseninnovations";

export async function deliverContact(
  payload,
  { website = false, origin = "" } = {},
) {
  if (
    website &&
    payload.usernames.some((name) => name !== WEBSITE_RECIPIENT_USERNAME)
  )
    throw new InputError(
      "The main website delivers only to nielseninnovations",
    );
  const usernames = website ? [WEBSITE_RECIPIENT_USERNAME] : payload.usernames;
  if (!usernames.length)
    throw new InputError("Include a recipient username in the contact request");
  const users = await User.find({
    active: true,
    username: mongoose.trusted({ $in: usernames }),
  })
    .select("_id username")
    .lean();
  if (users.length !== usernames.length) {
    if (website) {
      const error = new Error(
        "The homepage recipient is unavailable. Please try again later.",
      );
      error.status = 503;
      throw error;
    }
    throw new InputError("One or more recipient accounts are unavailable");
  }
  // A single write stores the message and all deliveries atomically.
  // Origin is unverified metadata, never an authorization or routing input.
  return Message.create({
    sourceKey: website ? "website" : "contact",
    sourceName: website ? "Nielsen Innovations website" : "Contact enquiry",
    origin: origin.slice(0, 512),
    sender: payload.sender,
    subject: payload.subject,
    body: payload.body,
    recipients: users.map((user) => ({
      userId: user._id,
      readAt: null,
      starred: false,
      archived: false,
    })),
  });
}

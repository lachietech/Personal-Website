import mongoose from "mongoose";
import { clientPortalDb } from "../../shared/config/databases.js";

const deliverySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortalUser",
      required: true,
    },
    readAt: { type: Date, default: null },
    starred: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    sourceKey: { type: String, required: true },
    sourceName: { type: String, required: true },
    origin: { type: String, default: "" },
    sender: {
      name: { type: String, required: true, maxlength: 120 },
      email: { type: String, required: true, maxlength: 254 },
    },
    subject: { type: String, required: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 4000 },
    recipients: {
      type: [deliverySchema],
      required: true,
      validate: (value) => value.length > 0,
    },
  },
  { timestamps: true, collection: "konnect_messages" },
);
schema.index({ "recipients.userId": 1, createdAt: -1, _id: -1 });

export default clientPortalDb.model("KonnectMessage", schema);

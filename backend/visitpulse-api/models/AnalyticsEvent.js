import mongoose from "mongoose";
import { clientPortalDb } from "../../shared/config/databases.js";

export const ANALYTICS_COLLECTION = "analytics_events";

const analyticsEventSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "PortalUser", required: true },
    username: { type: String, required: true, maxlength: 32 },
    site: { type: String, required: true, maxlength: 300 },
    sessionId: { type: String, required: true, maxlength: 64, index: true },
    path: { type: String, required: true, maxlength: 300, index: true },
    title: { type: String, default: "", maxlength: 160 },
    referrer: { type: String, default: "Direct", maxlength: 160 },
    device: {
      type: String,
      enum: ["Desktop", "Mobile", "Tablet", "Other"],
      default: "Other",
    },
    browser: { type: String, default: "Other", maxlength: 40 },
    occurredAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false, collection: ANALYTICS_COLLECTION },
);

analyticsEventSchema.index({ occurredAt: -1, path: 1 });
analyticsEventSchema.index({ ownerId: 1, occurredAt: -1 });

const AnalyticsEvent = clientPortalDb.model(
  "AnalyticsEvent",
  analyticsEventSchema,
  ANALYTICS_COLLECTION,
);

export default AnalyticsEvent;

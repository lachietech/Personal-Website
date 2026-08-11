import mongoose from "mongoose";
import { clientPortalDb } from "../../config/databases.js";

const analyticsEventSchema = new mongoose.Schema(
  {
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
  { versionKey: false },
);

analyticsEventSchema.index({ occurredAt: -1, path: 1 });

export default clientPortalDb.model("AnalyticsEvent", analyticsEventSchema);

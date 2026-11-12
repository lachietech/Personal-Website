import mongoose from "mongoose";
import { clientPortalDb } from "../../config/databases.js";

export const ANALYTICS_COLLECTION = "analytics_events";

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
  { versionKey: false, collection: ANALYTICS_COLLECTION },
);

analyticsEventSchema.index({ occurredAt: -1, path: 1 });

const AnalyticsEvent = clientPortalDb.model(
  "AnalyticsEvent",
  analyticsEventSchema,
  ANALYTICS_COLLECTION,
);

let storagePromise;

export function initialiseAnalyticsStorage() {
  if (!storagePromise) {
    storagePromise = (async () => {
      await clientPortalDb.asPromise();
      const exists = await clientPortalDb.db
        .listCollections({ name: ANALYTICS_COLLECTION }, { nameOnly: true })
        .hasNext();
      if (!exists) {
        await clientPortalDb.createCollection(ANALYTICS_COLLECTION);
      }
      await AnalyticsEvent.createIndexes();
      return true;
    })().catch((error) => {
      storagePromise = undefined;
      throw error;
    });
  }
  return storagePromise;
}

export default AnalyticsEvent;

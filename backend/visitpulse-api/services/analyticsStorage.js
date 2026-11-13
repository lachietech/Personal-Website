import { clientPortalDb } from "../../shared/config/databases.js";
import mongoose from "mongoose";
import User from "../../main-api/models/User.js";
import AnalyticsEvent, {
  ANALYTICS_COLLECTION,
} from "../models/AnalyticsEvent.js";

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
      // Pre-tenant records belonged exclusively to the original website.
      const legacyOwner = await User.findOne({ username: "nielseninnovations" }).select("_id");
      if (legacyOwner) {
        await AnalyticsEvent.updateMany(
          { ownerId: mongoose.trusted({ $exists: false }) },
          { $set: { ownerId: legacyOwner._id, username: "nielseninnovations", site: "https://nielseninnovations.com" } },
        );
      }
      return true;
    })().catch((error) => {
      storagePromise = undefined;
      throw error;
    });
  }
  return storagePromise;
}

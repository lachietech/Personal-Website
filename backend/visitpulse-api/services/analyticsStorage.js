import { clientPortalDb } from "../../shared/config/databases.js";
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
      return true;
    })().catch((error) => {
      storagePromise = undefined;
      throw error;
    });
  }
  return storagePromise;
}

import { apis } from "./apis.js";

// Startup data tasks run only after databases are connected.
// Preserve the existing nonfatal behavior: log failures and keep the API available.
export async function initialiseApplication() {
  for (const api of apis) {
    if (!api.initialise) continue;
    try {
      await api.initialise();
    } catch (error) {
      console.error(`Unable to initialise ${api.name}:`, error.message);
    }
  }
}

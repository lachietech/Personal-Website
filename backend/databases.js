import mongoose from "mongoose";
import "./config/environment.js";

mongoose.set('sanitizeFilter', true);

function createDatabaseConnection(label, uri) {
  const connection = mongoose.createConnection(uri);
  connection.on("connected", () => console.log(`Connected to ${label} database.`));
  connection.on("error", (error) => console.error(`${label} DB error:`, error.message));
  return connection;
}

export const meandersuiteDb = createDatabaseConnection(
  "MeanderSuite",
  process.env.MONGO_URI_MEANDERSUITE
);
export const pinpointDb = createDatabaseConnection(
  "Pinpoint",
  process.env.MONGO_URI_PINPOINT
);
export const superchatDb = createDatabaseConnection(
  "SuperChat",
  process.env.MONGO_URI_SCV1
);
export const uniformsDb = createDatabaseConnection(
  "HFSS Uniforms",
  process.env.MONGO_URI_UNIFORMS
);
export const clientPortalDb = createDatabaseConnection(
  "Client Portal",
  process.env.MONGO_URI_CLIENT
);

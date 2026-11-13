import mongoose from "mongoose";
import "./environment.js";

mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

function createDatabaseConnection(label) {
  // Models can register on these handles without opening network connections.
  const connection = mongoose.createConnection();
  connection.on("connected", () =>
    console.log(`Connected to ${label} database.`),
  );
  connection.on("error", (error) =>
    console.error(`${label} DB error:`, error.message),
  );
  return connection;
}

export const meandersuiteDb = createDatabaseConnection("MeanderSuite");
export const uniformsDb = createDatabaseConnection("HFSS Uniforms");
export const clientPortalDb = createDatabaseConnection("Client Portal");

const databases = [
  [clientPortalDb, "MONGO_URI_CLIENT"],
  [uniformsDb, "MONGO_URI_UNIFORMS"],
  [meandersuiteDb, "MONGO_URI_MEANDERSUITE"],
];

export async function connectDatabases(env = process.env) {
  // Wait for every attempt to settle before cleanup so none can open afterward.
  const results = await Promise.allSettled(
    databases.map(async ([connection, key]) => {
      if (!env[key]?.trim()) throw new Error(`Missing configuration: ${key}`);
      await connection.openUri(env[key]);
    }),
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure) {
    await disconnectDatabases();
    throw failure.reason;
  }
}

export async function disconnectDatabases() {
  await Promise.all(databases.map(([connection]) => connection.close()));
}

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const meandersuiteDb = mongoose.createConnection(process.env.MONGO_URI_MEANDERSUITE);
meandersuiteDb.on('connected', () => console.log("Connected to MeanderSuite database."));
meandersuiteDb.on('error', (err) => console.error("MeanderSuite DB error:", err.message));

export const pinpointDb = mongoose.createConnection(process.env.MONGO_URI_PINPOINT);
pinpointDb.on('connected', () => console.log("Connected to Pinpoint database."));
pinpointDb.on('error', (err) => console.error("Pinpoint DB error:", err.message));

export const superchatDb = mongoose.createConnection(process.env.MONGO_URI_SCV1);
superchatDb.on('connected', () => console.log("Connected to SuperChat database."));
superchatDb.on('error', (err) => console.error("SuperChat DB error:", err.message));

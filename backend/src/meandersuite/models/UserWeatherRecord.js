import mongoose from "mongoose";
import { meandersuiteDb } from "../../config/databases.js";

const locationSchema = new mongoose.Schema(
  {
    local: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

const userWeatherRecordSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  first_name: String,
  last_name: String,
  location: locationSchema,
  timestamp: { type: Date, default: Date.now },
  zone: String,
  data: mongoose.Schema.Types.Mixed,
});

export default meandersuiteDb.model(
  "UserWeatherRecord",
  userWeatherRecordSchema,
);

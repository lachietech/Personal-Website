import mongoose from "mongoose";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function getObjectId(value) {
  if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value)) {
    return null;
  }
  return new mongoose.Types.ObjectId(value);
}

export function requireObjectIdParam(label = "record") {
  return (_req, res, next, value) => {
    if (!getObjectId(value)) {
      return res.status(400).json({ error: `Invalid ${label} id` });
    }
    return next();
  };
}

export function getObjectIdArray(value, maxItems = 500) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error("Invalid record selection");
  }
  const ids = value.map((id) => String(id || ""));
  if (!ids.every((id) => mongoose.Types.ObjectId.isValid(id))) {
    throw new Error("Invalid record selection");
  }
  return [...new Set(ids)];
}

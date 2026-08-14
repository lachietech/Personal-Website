import mongoose from "mongoose";

export function requireObjectIdParam(label = "record") {
  return (_req, res, next, value) => {
    if (!mongoose.Types.ObjectId.isValid(String(value || ""))) {
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

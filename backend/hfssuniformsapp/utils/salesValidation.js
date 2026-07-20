import mongoose from "mongoose";

const SAFE_TEXT_PATTERN = /^[A-Za-z0-9 .\-_/()+&]{1,64}$/;

export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

export function sanitizeSalesText(value, fieldName) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (!SAFE_TEXT_PATTERN.test(trimmed)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  return trimmed;
}

export function validateSalesSeries(months, sales) {
  if (!Array.isArray(months) || !Array.isArray(sales)) {
    throw new Error("Months and sales must be arrays");
  }
  if (months.length !== sales.length) {
    throw new Error("Months and sales arrays must have the same length");
  }
}

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

  if (months.length > 120) {
    throw new Error("Sales series cannot contain more than 120 months");
  }

  const safeMonths = months.map((month) =>
    sanitizeSalesText(month, "month"),
  );
  const safeSales = sales.map((value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new Error("Sales values must be non-negative numbers");
    }
    return numericValue;
  });

  return { months: safeMonths, sales: safeSales };
}

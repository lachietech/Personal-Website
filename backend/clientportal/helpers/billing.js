import Settings from "../models/Settings.js";
import { getOptionalText } from "./validation.js";

export function serializeBilling(settings) {
  return {
    businessName: settings?.businessName || "Nielsen Innovations",
    abn: settings?.abn || "",
    bankName: settings?.bankName || "",
    accountName: settings?.accountName || "",
    bsb: settings?.bsb || "",
    accountNumber: settings?.accountNumber || "",
    paymentReference: settings?.paymentReference
      || "Use the invoice number as payment reference",
    paymentTerms: settings?.paymentTerms
      || "Payment due by the invoice due date."
  };
}

export function getBillingSettings() {
  return Settings.findOneAndUpdate(
    { key: "billing" },
    { $setOnInsert: { key: "billing" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export function getBillingPayload(body) {
  return {
    businessName: getOptionalText(body?.businessName, 160) || "Nielsen Innovations",
    abn: getOptionalText(body?.abn, 40),
    bankName: getOptionalText(body?.bankName, 120),
    accountName: getOptionalText(body?.accountName, 160),
    bsb: getOptionalText(body?.bsb, 20),
    accountNumber: getOptionalText(body?.accountNumber, 40),
    paymentReference: getOptionalText(body?.paymentReference, 120),
    paymentTerms: getOptionalText(body?.paymentTerms, 1000)
  };
}

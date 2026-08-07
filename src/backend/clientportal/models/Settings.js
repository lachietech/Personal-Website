import mongoose from "mongoose";
import { clientPortalDb } from "../../databases.js";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "Nielsen Innovations"
    },
    abn: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    accountName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ""
    },
    bsb: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ""
    },
    accountNumber: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Use the invoice number as payment reference"
    },
    paymentTerms: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "Payment due by the invoice due date."
    }
  },
  { timestamps: true }
);

export default clientPortalDb.model("PortalSettings", settingsSchema);

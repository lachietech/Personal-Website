import mongoose from "mongoose";
import { clientPortalDb } from "../../databases.js";

const invoiceLineSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: true }
);

const hourEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },
    hours: {
      type: Number,
      required: true,
      min: 0
    },
    work: {
      type: String,
      required: true,
      trim: true,
      maxlength: 320
    }
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40
    },
    status: {
      type: String,
      enum: ["draft", "sent", "overdue", "paid"],
      default: "draft"
    },
    issued: {
      type: Date,
      required: true
    },
    due: {
      type: Date,
      required: true
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.1
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    items: {
      type: [invoiceLineSchema],
      default: []
    },
    hours: {
      type: [hourEntrySchema],
      default: []
    }
  },
  { timestamps: true }
);

const clientSchema = new mongoose.Schema(
  {
    business: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    contact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    invoices: {
      type: [invoiceSchema],
      default: []
    }
  },
  { timestamps: true }
);

export default clientPortalDb.model("PortalClient", clientSchema);

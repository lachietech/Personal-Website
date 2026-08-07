import mongoose from "mongoose";
import { clientPortalDb } from "../../databases.js";

const bookkeepingTransactionSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortalUser",
      required: true,
      index: true
    },
    ownerClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PortalClient",
      default: null,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280
    },
    category: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    account: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Business Checking"
    },
    debitAccount: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    creditAccount: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      index: true
    },
    reviewed: {
      type: Boolean,
      default: false
    },
    source: {
      type: String,
      enum: ["manual", "import"],
      default: "manual"
    },
    importFingerprint: {
      type: String,
      trim: true,
      maxlength: 220,
      default: ""
    },
    receipt: {
      filename: {
        type: String,
        trim: true,
        maxlength: 180,
        default: ""
      },
      contentType: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ""
      },
      data: {
        type: Buffer,
        default: null
      },
      uploadedAt: {
        type: Date,
        default: null
      }
    }
  },
  { timestamps: true }
);

bookkeepingTransactionSchema.index({ ownerUserId: 1, date: -1 });
bookkeepingTransactionSchema.index({ ownerClientId: 1, date: -1 });

export default clientPortalDb.model("PortalBookkeepingTransaction", bookkeepingTransactionSchema);

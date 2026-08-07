import mongoose from "mongoose";
import { clientPortalDb } from "../../databases.js";

const bookkeepingRuleSchema = new mongoose.Schema(
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
    contains: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    account: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    }
  },
  { timestamps: true }
);

bookkeepingRuleSchema.index({ ownerUserId: 1, contains: 1 });

export default clientPortalDb.model("PortalBookkeepingRule", bookkeepingRuleSchema);

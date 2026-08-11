import mongoose from "mongoose";
import { clientPortalDb } from "../../config/databases.js";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    summary: { type: String, trim: true, maxlength: 500, default: "" },
    type: { type: String, trim: true, maxlength: 100, default: "Project" },
    status: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "Live project",
    },
    url: { type: String, trim: true, maxlength: 500, default: "" },
    image: { type: String, trim: true, maxlength: 500, default: "" },
    imageAlt: { type: String, trim: true, maxlength: 180, default: "" },
    visualClass: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "project-default",
    },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, min: 0, max: 10000 },
    github: {
      owner: { type: String, trim: true, maxlength: 100, default: "" },
      repo: { type: String, trim: true, maxlength: 100, default: "" },
      stars: { type: Number, default: 0, min: 0 },
      language: { type: String, trim: true, maxlength: 80, default: "" },
      lastSyncedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

projectSchema.index({ slug: 1 }, { unique: true });
projectSchema.index({ published: 1, sortOrder: 1 });

export default clientPortalDb.model("SiteProject", projectSchema);

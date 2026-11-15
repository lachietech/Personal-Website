import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import mongoose from "mongoose";
import Admin from "./models/admin.js";
import Notice from "./models/notice.js";
import Timetable from "./models/timetable.js";
import { seniorCitzDb } from "../shared/config/databases.js";
import { csrfTokenRoute } from "../shared/middleware/csrf.js";
import { rejectUnsafeRequestKeys } from "../shared/middleware/requestSecurity.js";

const router = Router();
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (seniorCitzDb.readyState !== 1) return res.status(503).json({ error: "Sandgate database is unavailable" });
  next();
});
const validText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const sessionAction = (req, action) => new Promise((resolve, reject) => req.session[action](error => error ? reject(error) : resolve()));
async function requireAdmin(req, res, next) {
  if (!req.session.seniorCitzAdmin || !await Admin.exists({ _id: req.session.seniorCitzAdmin })) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 20000, parts: 4 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      const error = new Error("Use a JPEG, PNG, WebP or GIF image");
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  }
}).single("image");
const formatNotice = n => ({ _id: n._id, title: n.title, content: n.content, postedAt: n.postedAt,
  imageUrl: n.image?.data ? `data:${n.image.contentType};base64,${n.image.data.toString("base64")}` : null });
function validId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
  next();
}
function noticeFields(req, res, next) {
  if (!validText(req.body?.title, 200) || !validText(req.body?.content, 20000)) {
    return res.status(400).json({ error: "Title (1–200 characters) and content (1–20000 characters) are required" });
  }
  req.noticeUpdate = { title: req.body.title.trim(), content: req.body.content.trim() };
  if (req.file) req.noticeUpdate.image = { data: req.file.buffer, contentType: req.file.mimetype };
  next();
}

router.get("/csrf-token", csrfTokenRoute);
router.get("/notices", async (_req, res) => res.json((await Notice.find().sort({ postedAt: -1 })).map(formatNotice)));
router.get("/timetable", async (_req, res) => res.json(await Timetable.getCurrent()));
router.get("/auth/session", requireAdmin, async (req, res) => {
  const admin = await Admin.findById(req.session.seniorCitzAdmin);
  res.json({ authenticated: true, admin: { id: admin._id, username: admin.username } });
});
router.post("/admin/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!validText(username, 100) || !validText(password, 1024)) return res.status(400).json({ error: "Username and password are required" });
  const admin = await Admin.findOne({ username: username.trim() });
  if (!admin || !await admin.validatePassword(password)) return res.status(401).json({ error: "Invalid username or password" });
  await sessionAction(req, "regenerate");
  req.session.seniorCitzAdmin = String(admin._id);
  await sessionAction(req, "save");
  res.json({ success: true });
});
router.post("/admin/logout", requireAdmin, async (req, res) => {
  delete req.session.seniorCitzAdmin;
  await sessionAction(req, "save");
  res.json({ success: true });
});
router.post("/auth/register", requireAdmin, async (req, res) => {
  const { username, password } = req.body || {};
  if (!validText(username, 100) || !validText(password, 72) || password.length < 12 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: "Use a username up to 100 characters and a password of at least 12 characters, at most 72 bytes" });
  }
  if (await Admin.exists({ username: username.trim() })) return res.status(409).json({ error: "User already exists" });
  await Admin.create({ username: username.trim(), password });
  res.status(201).json({ success: true });
});
router.post(["/admin/notice", "/notices"], requireAdmin, upload, rejectUnsafeRequestKeys, noticeFields, async (req, res) => {
  await Notice.create(req.noticeUpdate);
  res.status(201).json({ success: true });
});
router.put("/admin/notice/:id", requireAdmin, validId, upload, rejectUnsafeRequestKeys, noticeFields, async (req, res) => {
  const updated = await Notice.findByIdAndUpdate(req.params.id, req.noticeUpdate, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ error: "Notice not found" });
  res.json({ success: true, updated: formatNotice(updated) });
});
router.delete("/admin/notice/:id", requireAdmin, validId, async (req, res) => {
  if (!await Notice.findByIdAndDelete(req.params.id)) return res.status(404).json({ error: "Notice not found" });
  res.json({ success: true });
});
router.put("/admin/timetable", requireAdmin, async (req, res) => {
  const entries = req.body?.entries;
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 31 || entries.some(row =>
    !row || !validText(row.day, 40) || !validText(row.hours, 200) || !validText(row.activities, 2000))) {
    return res.status(400).json({ error: "Provide 1–31 rows with day, hours and activities" });
  }
  const cleanEntries = entries.map(({ day, hours, activities }) => ({ day: day.trim(), hours: hours.trim(), activities: activities.trim() }));
  const timetable = await Timetable.findOneAndUpdate({}, { entries: cleanEntries, updatedAt: new Date() }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ success: true, entries: timetable.entries });
});
router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: "Invalid upload: one image up to 5 MiB is allowed" });
  if (error.status === 400) return res.status(400).json({ error: error.message });
  next(error);
});
export default router;


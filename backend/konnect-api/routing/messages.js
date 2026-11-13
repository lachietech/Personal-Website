import express from "express";
import mongoose from "mongoose";
import Message from "../models/KonnectMessage.js";
import { requirePortalAuth } from "../../main-api/middleware/auth.js";
import { apiLimiter } from "../../shared/middleware/rateLimits.js";
import { requireObjectIdParam } from "../../shared/middleware/databaseInput.js";
import { InputError } from "../../shared/utils/security.js";
import {
  deliveryFilter,
  serializeMessage,
  statePatch,
} from "../utils/konnect.js";

const router = express.Router();
router.use(apiLimiter, requirePortalAuth);
router.param("messageId", requireObjectIdParam("message"));

router.get("/messages", async (req, res) => {
  const folder = req.query.folder || "inbox";
  const page = Number(req.query.page || 1);
  const q = req.query.q || "";
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    typeof q !== "string" ||
    q.length > 120
  )
    throw new InputError("Invalid mailbox search or page");
  const filter = deliveryFilter(req.portalUser.id, folder);
  if (q.trim()) {
    const search = mongoose.trusted({
      $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    });
    filter.$or = [
      { subject: search },
      { "sender.name": search },
      { "sender.email": search },
      { body: search },
    ];
  }
  const limit = 25;
  const [messages, total, inbox, unread, starred, archive, all] =
    await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter),
      ...["inbox", "unread", "starred", "archive", "all"].map((name) =>
        Message.countDocuments(deliveryFilter(req.portalUser.id, name)),
      ),
    ]);
  res.json({
    messages: messages.map((message) =>
      serializeMessage(message, req.portalUser.id),
    ),
    total,
    page,
    pageSize: limit,
    counts: { inbox, unread, starred, archive, all },
  });
});
router.get("/messages/:messageId", async (req, res) => {
  const message = await Message.findOne({
    _id: req.params.messageId,
    ...deliveryFilter(req.portalUser.id, "all"),
  }).lean();
  if (!message) return res.status(404).json({ error: "Message not found" });
  res.json({ message: serializeMessage(message, req.portalUser.id, true) });
});
router.patch("/messages/:messageId", async (req, res) => {
  const patch = statePatch(req.body);
  const message = await Message.findOneAndUpdate(
    { _id: req.params.messageId, ...deliveryFilter(req.portalUser.id, "all") },
    { $set: patch },
    { new: true, runValidators: true },
  ).lean();
  if (!message) return res.status(404).json({ error: "Message not found" });
  res.json({ message: serializeMessage(message, req.portalUser.id, true) });
});

router.use((error, _req, res, next) => {
  if (error instanceof InputError)
    return res.status(400).json({ error: error.message });
  next(error);
});
export default router;

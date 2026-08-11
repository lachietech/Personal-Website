import express from "express";
import rateLimit from "express-rate-limit";
import { requirePortalAdmin, requirePortalAuth } from "../middleware/auth.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import {
  getAnalyticsPayload,
  getAnalyticsStartDate,
} from "../utils/analytics.js";

const router = express.Router();
const collectionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many analytics events" },
});

router.post("/event", collectionLimiter, async (req, res) => {
  try {
    await AnalyticsEvent.create(
      getAnalyticsPayload(req.body, req.headers["user-agent"]),
    );
    return res.status(202).json({ ok: true });
  } catch (error) {
    if (error?.name === "ValidationError" || /^Invalid analytics/.test(error.message)) {
      return res.status(400).json({ error: "Invalid analytics event" });
    }
    console.error("Unable to record analytics event:", error.message);
    return res.status(500).json({ error: "Unable to record analytics event" });
  }
});

router.get("/summary", requirePortalAuth, requirePortalAdmin, async (req, res) => {
  const { days, startDate } = getAnalyticsStartDate(req.query.days);
  const match = { occurredAt: { $gte: startDate } };
  const [totals, daily, pages, referrers, devices, browsers, recent] =
    await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            pageViews: { $sum: 1 },
            sessions: { $addToSet: "$sessionId" },
          },
        },
        { $project: { _id: 0, pageViews: 1, visitors: { $size: "$sessions" } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } }, views: { $sum: 1 }, sessions: { $addToSet: "$sessionId" } } },
        { $project: { _id: 0, date: "$_id", views: 1, visitors: { $size: "$sessions" } } },
        { $sort: { date: 1 } },
      ]),
      rankedCounts(match, "$path", "path"),
      rankedCounts(match, "$referrer", "referrer"),
      rankedCounts(match, "$device", "device"),
      rankedCounts(match, "$browser", "browser"),
      AnalyticsEvent.find(match)
        .sort({ occurredAt: -1 })
        .limit(20)
        .select("path title referrer device browser occurredAt -_id")
        .lean(),
    ]);

  const summary = totals[0] || { pageViews: 0, visitors: 0 };
  return res.json({
    days,
    totals: {
      ...summary,
      viewsPerVisitor: summary.visitors
        ? Number((summary.pageViews / summary.visitors).toFixed(1))
        : 0,
    },
    daily,
    pages,
    referrers,
    devices,
    browsers,
    recent,
  });
});

function rankedCounts(match, field, label) {
  return AnalyticsEvent.aggregate([
    { $match: match },
    { $group: { _id: field, views: { $sum: 1 }, sessions: { $addToSet: "$sessionId" } } },
    { $project: { _id: 0, [label]: "$_id", views: 1, visitors: { $size: "$sessions" } } },
    { $sort: { views: -1 } },
    { $limit: 10 },
  ]);
}

export default router;

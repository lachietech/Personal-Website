import express from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { requirePortalAdmin, requirePortalAuth } from "../middleware/auth.js";
import AnalyticsEvent, {
  ANALYTICS_COLLECTION,
  initialiseAnalyticsStorage,
} from "../models/AnalyticsEvent.js";
import {
  buildAnalyticsSummary,
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

initialiseAnalyticsStorage()
  .then(() => console.log(`Analytics storage ready: ${ANALYTICS_COLLECTION}`))
  .catch((error) =>
    console.error("Unable to initialise analytics storage:", error.message),
  );

router.post("/event", collectionLimiter, async (req, res) => {
  try {
    await initialiseAnalyticsStorage();
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
  try {
    await initialiseAnalyticsStorage();
    const { days, startDate } = getAnalyticsStartDate(req.query.days);
    const events = await AnalyticsEvent.find({
      // The operator is created by this route, not supplied by the request.
      // Mark it trusted so the global sanitizeFilter setting does not wrap the
      // range in $eq and attempt to cast the entire object as a Date.
      occurredAt: mongoose.trusted({ $gte: startDate }),
    })
      .sort({ occurredAt: -1 })
      .limit(50000)
      .select("sessionId path title referrer device browser occurredAt -_id")
      .lean();

    return res.json({
      ...buildAnalyticsSummary(events, days),
      storage: {
        connected: true,
        collection: ANALYTICS_COLLECTION,
        eventsInPeriod: events.length,
      },
    });
  } catch (error) {
    console.error("Unable to load analytics summary:", error.message);
    return res.status(503).json({
      error: "Analytics data is temporarily unavailable. Please try again.",
    });
  }
});

export default router;

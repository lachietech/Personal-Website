import express from "express";
import mongoose from "mongoose";
import {
  requirePortalAuth,
} from "../../main-api/middleware/auth.js";
import AnalyticsEvent, {
  ANALYTICS_COLLECTION,
} from "../models/AnalyticsEvent.js";
import { initialiseAnalyticsStorage } from "../services/analyticsStorage.js";
import {
  buildAnalyticsSummary,
  getAnalyticsStartDate,
} from "../utils/analytics.js";

const router = express.Router();
router.get(
  "/summary",
  requirePortalAuth,
  async (req, res) => {
    try {
      await initialiseAnalyticsStorage();
      const { days, startDate } = getAnalyticsStartDate(req.query.days);
      const events = await AnalyticsEvent.find({
        // The operator is created by this route, not supplied by the request.
        // Mark it trusted so the global sanitizeFilter setting does not wrap the
        // range in $eq and attempt to cast the entire object as a Date.
        ownerId: req.portalUser.id,
        occurredAt: mongoose.trusted({ $gte: startDate }),
      })
        .sort({ occurredAt: -1 })
        .limit(50000)
        .select("sessionId site path title referrer device browser occurredAt -_id")
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
  },
);

export default router;

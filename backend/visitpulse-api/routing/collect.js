import express from "express";
import rateLimit from "express-rate-limit";
import User from "../../main-api/models/User.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import { initialiseAnalyticsStorage } from "../services/analyticsStorage.js";
import { getAnalyticsPayload } from "../utils/analytics.js";
import { rejectUnsafeRequestKeys } from "../../shared/middleware/requestSecurity.js";

export function configuredSites() {
  // This allowlist is separate from the authenticated portal's trusted origins.
  const sites = JSON.parse(process.env.VISITPULSE_SITES || JSON.stringify({
    nielseninnovations: [
      "https://nielseninnovations.com", "https://www.nielseninnovations.com",
      ...(process.env.NODE_ENV === "production" ? [] : [
        "http://localhost:5000", "http://localhost:5173",
        "http://127.0.0.1:5000", "http://127.0.0.1:5173",
      ]),
    ],
  }));
  if (!sites || Array.isArray(sites) || typeof sites !== "object") throw new Error("Invalid VISITPULSE_SITES");
  for (const [username, origins] of Object.entries(sites)) {
    if (!/^[a-z0-9._-]{3,32}$/.test(username) || !Array.isArray(origins)) throw new Error("Invalid VISITPULSE_SITES");
    for (const origin of origins) {
      const url = new URL(origin);
      if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin) throw new Error("Invalid VisitPulse origin");
    }
  }
  return sites;
}

export function createCollectionRouter({ users = User, events = AnalyticsEvent, initialise = initialiseAnalyticsStorage } = {}) {
  const router = express.Router();
  const limiter = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many analytics events" } });
  const originPolicy = (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.vary("Origin");
    try {
      req.visitpulseSites = configuredSites();
      const origin = req.get("origin");
      if (!origin || !Object.values(req.visitpulseSites).some((origins) => origins.includes(origin))) {
        return res.status(403).json({ error: "Origin is not registered for VisitPulse" });
      }
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "600");
      return next();
    } catch {
      return res.status(503).json({ error: "VisitPulse configuration is unavailable" });
    }
  };
  // /event remains an alias for existing integrations; both paths use the same policy.
  const paths = ["/v1/events", "/event"];
  router.options(paths, originPolicy, (_req, res) => res.sendStatus(204));
  router.post(paths, originPolicy, limiter, (req, res, next) => {
    if (!req.is("application/json")) return res.status(415).json({ error: "Use application/json" });
    return next();
  }, express.json({ limit: "4kb" }), rejectUnsafeRequestKeys, async (req, res) => {
    const username = req.body?.username;
    if (typeof username !== "string" || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ error: "Invalid analytics username" });
    }
    const site = req.get("origin");
    if (!Object.hasOwn(req.visitpulseSites, username) || !req.visitpulseSites[username].includes(site)) {
      return res.status(403).json({ error: "Origin is not registered for this account" });
    }
    let payload;
    try { payload = getAnalyticsPayload(req.body, req.get("user-agent")); }
    catch { return res.status(400).json({ error: "Invalid analytics event" }); }
    try {
      const user = await users.findOne({ username, active: true }).select("_id username");
      if (!user) return res.status(403).json({ error: "Analytics account is unavailable" });
      await initialise();
      await events.create({ ...payload, ownerId: user._id, username: user.username, site });
      return res.status(202).json({ ok: true });
    } catch (error) {
      console.error("Unable to record analytics event:", error.message);
      return res.status(503).json({ error: "Analytics storage is temporarily unavailable" });
    }
  });
  return router;
}

export default createCollectionRouter();

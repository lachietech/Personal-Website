import express from "express";
import rateLimit from "express-rate-limit";
import { deliverContact } from "../services/konnect.js";
import { contactPayload } from "../utils/konnect.js";
import { InputError } from "../../shared/utils/security.js";
import { rejectUnsafeRequestKeys } from "../../shared/middleware/requestSecurity.js";

const router = express.Router();
// Keep old form URLs working, without looking up registered sources.
const paths = ["/contact", "/forms/:key/messages"];
router.use(
  paths,
  (req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Access-Control-Expose-Headers": "Retry-After",
    });
    next();
  },
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  }),
);
router.options(paths, (_req, res) => res.sendStatus(204));
router.post(
  paths,
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many messages. Please try again later." },
  }),
  (req, res, next) =>
    req.is("application/json")
      ? next()
      : res.status(415).json({ error: "Use application/json" }),
  express.json({ limit: "16kb" }),
  rejectUnsafeRequestKeys,
  async (req, res, next) => {
    try {
      const website = req.params.key === "website";
      const payload = contactPayload(req.body, {
        allowMissingRecipient: website,
      });
      if (!payload.honeypot)
        await deliverContact(payload, {
          website,
          origin: req.get("origin") || "",
        });
      res.status(201).json({
        success: true,
        message:
          "Your message has been delivered. Thank you for getting in touch.",
      });
    } catch (error) {
      if (error instanceof InputError || error.status === 503)
        return res.status(error.status || 400).json({ error: error.message });
      next(error);
    }
  },
);
router.all(paths, (_req, res) =>
  res
    .status(405)
    .set("Allow", "POST, OPTIONS")
    .json({ error: "Method not allowed" }),
);
export default router;

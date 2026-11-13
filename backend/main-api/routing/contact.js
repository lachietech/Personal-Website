import express from "express";
import { contactLimiter } from "../../shared/middleware/rateLimits.js";
import { InputError } from "../../shared/utils/security.js";
import { deliverContact } from "../../konnect-api/services/konnect.js";
import { contactPayload } from "../../konnect-api/utils/konnect.js";

const router = express.Router();
router.post("/contact", contactLimiter, async (req, res) => {
  try {
    const payload = contactPayload(req.body, { allowMissingRecipient: true });
    if (!payload.honeypot)
      await deliverContact(payload, {
        website: true,
        origin: req.get("origin") || "",
      });

    return res.json({
      success: true,
      message:
        "Your message has been delivered. Thank you for getting in touch.",
    });
  } catch (error) {
    if (error instanceof InputError || error.status === 503) {
      return res.status(error.status || 400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Contact form error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
});

export default router;

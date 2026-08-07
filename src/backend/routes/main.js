import express from "express";
import path from "node:path";
import { contactLimiter } from "../ratelimits.js";
import {
  InputError,
  getEmail,
  getMessage,
  getRequiredString,
} from "../security.js";
import { sendContactEmail } from "../services/contactEmail.js";

const router = express.Router();
const websiteDocument = path.resolve(
  import.meta.dirname,
  "../../../public/index.html",
);

router.get("/", (_req, res) => {
  res.sendFile(websiteDocument);
});

router.post("/contact", contactLimiter, async (req, res) => {
  try {
    const name = getRequiredString(req.body.name, "Name", 120);
    const email = getEmail(req.body.email);
    const subject = getRequiredString(req.body.subject, "Subject", 160);
    const message = getMessage(req.body.message);

    await sendContactEmail({ name, email, subject, message });

    return res.json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
    });
  } catch (error) {
    if (error instanceof InputError) {
      return res.status(400).json({
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

import path from "path";
import rateLimit from "express-rate-limit";

export const PORTAL_BASE_PATH = "/clientportal";
export const PORTAL_TEMPLATE_ROOT = path.join(
  import.meta.dirname,
  "../../public/templates/clientportal"
);

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many sign in attempts. Please try again later." }
});

export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many portal requests. Please try again later." }
});

export function preventCaching(req, res, next) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}

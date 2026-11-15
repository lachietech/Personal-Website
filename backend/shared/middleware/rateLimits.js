import rateLimit from "express-rate-limit";
import { getTrustedOrigin } from "./requestSecurity.js";

// General rate limiter for all routes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Keep broad abuse protection without punishing normal app use.
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    const origin = getTrustedOrigin(req.get("origin"));
    res.vary("Origin");
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Access-Control-Expose-Headers", "Retry-After, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset");
    }
    res.set("Cache-Control", "no-store");
    res.status(options.statusCode).json(options.message);
  },
});

// Rate limiter for authentication routes (login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register attempts per 15 minutes
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for contact form submissions
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 contact form submissions per hour
  message: "Too many contact form submissions, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // SPA screens can legitimately make many API calls.
  message: "Too many API requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for GET requests
export const getLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 150, // Limit each IP to 150 GET requests per 5 minutes
  message: "Too many requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "GET", // Only apply to GET requests
});

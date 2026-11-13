import rateLimit from "express-rate-limit";

const defaults = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
};

export const generalLimiter = rateLimit({
  ...defaults,
  max: 600,
  skip: (req) =>
    req.method === "GET" &&
    /\.(?:css|js|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/i.test(
      req.path,
    ),
});

export const authLimiter = rateLimit({
  ...defaults,
  max: 25,
  skipSuccessfulRequests: true,
  skip: (req) => req.method === "GET" || req.path === "/logout",
  message: { error: "Too many sign in attempts. Please try again later." },
});

export const uniformsApiLimiter = rateLimit({
  ...defaults,
  max: 300,
  message: { error: "Too many requests. Please try again later." },
});

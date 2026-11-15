import { securityHeaders, sessionOptions } from "./shared/config/http.js";
import cookieParser from "cookie-parser";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import { apis } from "./apis.js";
import { environment } from "./shared/config/environment.js";
import {
  csrfTokenRoute,
  generateCsrfToken,
  protectFromCsrf,
} from "./shared/middleware/csrf.js";
import { generalLimiter } from "./shared/middleware/rateLimits.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/errors.js";
import {
  enforceTrustedOrigins,
  rejectUnsafeRequestKeys,
} from "./shared/middleware/requestSecurity.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", environment.trustProxy);

  app.use(helmet(securityHeaders));
  // Bound every request before parsing bodies, creating sessions or routing.
  app.use(generalLimiter);
  // Public intake routers enforce their own origin policies without credentials.
  // All authenticated mailbox APIs still pass through session and CSRF checks.
  for (const api of apis) {
    if (api.publicRouter) app.use(api.path, api.publicRouter);
  }
  app.use(cookieParser());
  app.use(enforceTrustedOrigins);
  app.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "backend" }),
  );
  app.use(express.urlencoded({ extended: false, limit: "50kb" }));
  app.use(express.json({ limit: "50kb" }));
  app.use(rejectUnsafeRequestKeys);
  app.use(session(sessionOptions));

  app.locals.generateCsrfToken = generateCsrfToken;
  app.get("/csrf-token", csrfTokenRoute);
  app.use(protectFromCsrf);

  for (const api of apis) app.use(api.path, api.router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

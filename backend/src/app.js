import cookieParser from "cookie-parser";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import clientPortalRoutes from "./clientportal/routing/index.js";
import { environment } from "./config/environment.js";
import hfssUniformsRoutes from "./hfssuniformsapp/routing/index.js";
import {
  csrfTokenRoute,
  generateCsrfToken,
  protectFromCsrf,
} from "./middleware/csrf.js";
import meanderRoutes from "./meandersuite/routing/index.js";
import { generalLimiter } from "./middleware/rateLimits.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import {
  enforceTrustedOrigins,
  rejectUnsafeRequestKeys,
} from "./middleware/requestSecurity.js";
import mainRoutes from "./routing/main.js";
import konnectFormRoutes from "./clientportal/routing/konnectForms.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", environment.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          workerSrc: ["'none'"],
          manifestSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: environment.isProduction ? [] : null,
        },
      },
    }),
  );
  // Public intake accepts any origin without credentials.
  // All authenticated mailbox APIs still pass through session and CSRF checks.
  app.use("/clientportal/api/konnect", konnectFormRoutes);
  app.use(cookieParser());
  app.use(enforceTrustedOrigins);
  app.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "backend" }),
  );
  app.use(express.urlencoded({ extended: false, limit: "50kb" }));
  app.use(express.json({ limit: "50kb" }));
  app.use(rejectUnsafeRequestKeys);
  app.use(
    session({
      secret: environment.sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: "psifi.sid",
      cookie: {
        secure: environment.isProduction,
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 8,
      },
    }),
  );

  app.locals.generateCsrfToken = generateCsrfToken;
  app.use(generalLimiter);
  app.get("/csrf-token", csrfTokenRoute);
  app.use(protectFromCsrf);

  app.use("/", mainRoutes);
  app.use("/clientportal", clientPortalRoutes);
  app.use("/meandersuite", meanderRoutes);
  app.use("/hfssuniformsapp", hfssUniformsRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

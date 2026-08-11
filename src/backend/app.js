import cookieParser from "cookie-parser";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import path from "node:path";
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
import mainRoutes from "./routing/main.js";

const publicDirectory = path.resolve(import.meta.dirname, "../../public");
const assetDirectory = path.resolve(import.meta.dirname, "../assets");

export function createApp() {
  const app = express();

  if (environment.isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(express.static(publicDirectory));
  app.use("/static", express.static(assetDirectory));
  app.use(express.urlencoded({ extended: false, limit: "50kb" }));
  app.use(express.json({ limit: "50kb" }));
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
  return app;
}

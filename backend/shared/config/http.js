import { cookieSettings } from "./cookies.js";
import { environment } from "./environment.js";

export const securityHeaders = {
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
};

export const sessionOptions = {
  secret: environment.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: "psifi.sid",
  cookie: {
    httpOnly: true,
    ...cookieSettings(),
    maxAge: 1000 * 60 * 60 * 8,
  },
};

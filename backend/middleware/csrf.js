import { doubleCsrf } from "csrf-csrf";
import { environment } from "../config/environment.js";

const csrf = doubleCsrf({
  getSecret: () => environment.csrfSecret,
  getSessionIdentifier: (req) => req.sessionID,
  cookieName: environment.isProduction
    ? "__Host-psifi.x-csrf-token"
    : "psifi.x-csrf-token",
  cookieOptions: {
    sameSite: "strict",
    path: "/",
    secure: environment.isProduction,
    httpOnly: true
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return req.body?._csrf;
    }
    return req.headers["x-csrf-token"];
  }
});

export const generateCsrfToken = csrf.generateCsrfToken;

export function csrfTokenRoute(req, res) {
  req.session.csrfReady = true;
  const csrfToken = generateCsrfToken(req, res);

  req.session.save((error) => {
    if (error) {
      res.status(500).json({ message: "Unable to create CSRF token" });
      return;
    }
    res.json({ csrfToken });
  });
}

export function protectFromCsrf(req, res, next) {
  // The uniforms app owns a separate CSRF cookie scoped to its route.
  if (req.path.startsWith("/hfssuniformsapp")) {
    next();
    return;
  }
  csrf.doubleCsrfProtection(req, res, next);
}

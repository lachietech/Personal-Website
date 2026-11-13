import { doubleCsrf } from "csrf-csrf";
import { cookieSettings } from "../../shared/config/cookies.js";

const basePath = "/hfssuniformsapp";
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.sessionID,
  cookieName: "uniform_shop_csrf_secret",
  cookieOptions: {
    httpOnly: true,
    ...cookieSettings(),
    path: basePath,
  },
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
});

function exposeCsrfToken(req, res) {
  req.session.csrfReady = true;
  const csrfToken = generateCsrfToken(req, res);
  res.cookie("uniform_shop_csrf_token", csrfToken, {
    httpOnly: false,
    ...cookieSettings(),
    path: basePath,
  });
  res.setHeader("X-CSRF-Token", csrfToken);
  return csrfToken;
}

export function protectFromCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.path !== "/api/csrf-token") {
      exposeCsrfToken(req, res);
      req.session.save(next);
      return;
    }
    next();
    return;
  }
  doubleCsrfProtection(req, res, next);
}

export function csrfTokenRoute(req, res) {
  const csrfToken = exposeCsrfToken(req, res);
  req.session.save((error) => {
    if (error) {
      res.status(500).json({ error: "Unable to create CSRF token" });
      return;
    }
    res.json({ csrfToken });
  });
}

export function csrfErrorHandler(error, _req, res, next) {
  if (error?.code === "EBADCSRFTOKEN" || error?.code === "INVALID_CSRF_TOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  return next(error);
}

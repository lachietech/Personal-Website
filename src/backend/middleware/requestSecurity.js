const PRODUCTION_ORIGINS = [
  "https://nielseninnovations.com",
  "https://www.nielseninnovations.com",
];
const DEVELOPMENT_ORIGINS = [
  "http://localhost:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5173",
];
const ALLOWED_METHODS = "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, X-CSRF-Token";

function configuredOrigins() {
  const environmentOrigins = String(process.env.TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const configured = [
    ...PRODUCTION_ORIGINS,
    ...(process.env.NODE_ENV === "production" ? [] : DEVELOPMENT_ORIGINS),
    ...environmentOrigins,
  ];
  const allowedOrigins = new Map();

  for (const candidate of configured) {
    try {
      const parsed = new URL(candidate);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.pathname !== "/" ||
        parsed.search ||
        parsed.hash
      ) {
        continue;
      }
      allowedOrigins.set(parsed.origin, parsed.origin);
    } catch {
      // Invalid configured values must not weaken the allowlist.
    }
  }

  return allowedOrigins;
}

function isApiPath(path) {
  return path === "/csrf-token" || /(?:^|\/)api(?:\/|$)/.test(path);
}

export function getTrustedOrigin(origin) {
  if (!origin || origin === "null") return null;
  try {
    const parsedOrigin = new URL(origin).origin;
    return configuredOrigins().get(parsedOrigin) || null;
  } catch {
    return null;
  }
}

export function isTrustedOrigin(origin) {
  return Boolean(getTrustedOrigin(origin));
}

export function enforceTrustedOrigins(req, res, next) {
  if (!isApiPath(req.path)) return next();

  const origin = req.get("origin");
  res.vary("Origin");
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Max-Age", "600");

  if (origin) {
    const trustedOrigin = getTrustedOrigin(origin);
    if (!trustedOrigin) {
      return res.status(403).json({ error: "Origin is not permitted" });
    }
    // Use the canonical value sourced from the server-side allowlist. Never
    // reflect the request header into a credentialed CORS response.
    res.setHeader("Access-Control-Allow-Origin", trustedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ error: "Cross-site request blocked" });
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
}

export function findDangerousKey(value, depth = 0, visited = { count: 0 }) {
  if (value === null || typeof value !== "object") return null;
  if (depth > 12 || visited.count++ > 5000) return "request structure";

  for (const [key, child] of Object.entries(value)) {
    if (
      key.startsWith("$") ||
      key.includes(".") ||
      ["__proto__", "prototype", "constructor"].includes(key)
    ) {
      return key;
    }
    const nested = findDangerousKey(child, depth + 1, visited);
    if (nested) return nested;
  }
  return null;
}

export function rejectUnsafeRequestKeys(req, res, next) {
  const dangerousKey =
    findDangerousKey(req.body) || findDangerousKey(req.query);
  if (dangerousKey) {
    return res.status(400).json({ error: "Request contains unsupported fields" });
  }
  return next();
}

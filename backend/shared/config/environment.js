import dotenv from "dotenv";
import path from "node:path";

// The repository-level file remains a migration fallback for existing installs.
// Only the backend reads it; frontend builds never load server secrets.
dotenv.config({
  path: process.env.BACKEND_ENV_FILE || [
    path.resolve(import.meta.dirname, "../../.env"),
    path.resolve(import.meta.dirname, "../../../.env"),
  ],
});

const configuredProxy =
  process.env.TRUST_PROXY || (process.env.RENDER === "true" ? "1" : "loopback");
export const environment = Object.freeze({
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5000,
  trustProxy: /^\d+$/.test(configuredProxy)
    ? Number(configuredProxy)
    : configuredProxy,
  sessionSecret: process.env.SECRET_KEY,
  csrfSecret: process.env.CSRF_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
});

// Validate only when starting the server; importing the app remains useful in tests.
export function validateEnvironment(env = process.env) {
  const required = [
    "SECRET_KEY",
    "CSRF_SECRET",
    "JWT_SECRET",
    "MONGO_URI_CLIENT",
    "MONGO_URI_UNIFORMS",
    "MONGO_URI_MEANDERSUITE",
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
  if (
    env.PORT !== undefined &&
    (!/^\d+$/.test(env.PORT) ||
      Number(env.PORT) < 1 ||
      Number(env.PORT) > 65535)
  ) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
}

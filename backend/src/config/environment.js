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

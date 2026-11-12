import dotenv from "dotenv";
import path from "node:path";
import { createFrontendApp } from "./app.js";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });
const port = Number(process.env.PORT) || 5173;
const app = createFrontendApp({
  backendUrl: process.env.BACKEND_URL || "http://127.0.0.1:5000",
  // Set to the address/subnet of the TLS ingress when one is present.
  trustProxy: process.env.TRUST_PROXY || false,
  isProduction: process.env.NODE_ENV === "production",
});
app.listen(port, () =>
  console.log(`Frontend started at http://localhost:${port}`),
);

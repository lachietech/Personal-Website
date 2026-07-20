import dotenv from "dotenv";

dotenv.config();

export const environment = Object.freeze({
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5000,
  sessionSecret: process.env.SECRET_KEY,
  csrfSecret: process.env.CSRF_SECRET
});

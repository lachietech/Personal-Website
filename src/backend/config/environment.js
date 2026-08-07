import dotenv from "dotenv";

dotenv.config();

export const environment = Object.freeze({
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 5000,
  sessionSecret: process.env.SECRET_KEY,
  csrfSecret: process.env.CSRF_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  contactFrom: "Contact Us <contactus@nielseninnovations.com>",
  contactTo: "nielseninnovation@outlook.com",
});

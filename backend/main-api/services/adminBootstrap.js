import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { validatePassword, validateUsername } from "../utils/portal-data.js";

export async function seedDefaultAdmin() {
  if (await User.exists({ role: "admin" })) {
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const username = String(
    process.env.CLIENT_PORTAL_BOOTSTRAP_ADMIN_USERNAME ||
      (!isProduction ? "admin" : ""),
  )
    .trim()
    .toLowerCase();
  const password = String(
    process.env.CLIENT_PORTAL_BOOTSTRAP_ADMIN_PASSWORD ||
      (!isProduction ? "password" : ""),
  );

  if (!username || !password) {
    console.error(
      "Client Portal admin bootstrap skipped: configure CLIENT_PORTAL_BOOTSTRAP_ADMIN_USERNAME and CLIENT_PORTAL_BOOTSTRAP_ADMIN_PASSWORD.",
    );
    return;
  }

  const validationError =
    validateUsername(username) ||
    (isProduction ? validatePassword(password) : null);
  if (validationError) {
    console.error(`Client Portal admin bootstrap skipped: ${validationError}`);
    return;
  }

  await User.create({
    username,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    active: true,
    mustChangePassword:
      !isProduction || !process.env.CLIENT_PORTAL_BOOTSTRAP_ADMIN_PASSWORD,
  });
  console.log("Created Client Portal bootstrap admin account.");
}

import express from "express";
import { authLimiter } from "../../middleware/rateLimits.js";
import {
  InputError,
  getEmail,
  getOptionalString,
  getPassword,
  getUsername,
  regenerateSession,
} from "../../utils/security.js";
import { authenticateUser, registerUser } from "../services/userService.js";

const router = express.Router();

router.post("/register", authLimiter, async (req, res) => {
  try {
    const username = getUsername(req.body.username);
    const password = getPassword(req.body.password);
    if (password !== getPassword(req.body.passwordconf))
      return res.status(400).json({ error: "Passwords do not match" });
    await registerUser({
      username,
      password,
      email: getEmail(req.body.email),
      first_name: getOptionalString(req.body.first_name, 80),
      last_name: getOptionalString(req.body.last_name, 80),
      location: {
        local: getOptionalString(req.body.locationl, 120),
        state: getOptionalString(req.body.locations, 120),
        country: getOptionalString(req.body.locationc, 120),
      },
    });
    await regenerateSession(req, {
      app: "meandersuite",
      logged_in: true,
      username,
    });
    return res
      .status(201)
      .json({ ok: true, redirectTo: "/meandersuite/suite" });
  } catch (error) {
    const status =
      error instanceof InputError || /already exists/i.test(error.message)
        ? 400
        : 500;
    if (status === 500)
      console.error("Meander Suite registration error:", error.message);
    return res
      .status(status)
      .json({
        error: status === 500 ? "Unable to create your account" : error.message,
      });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const username = getUsername(req.body.username);
    await authenticateUser({
      username,
      password: getPassword(req.body.password),
    });
    await regenerateSession(req, {
      app: "meandersuite",
      logged_in: true,
      username,
    });
    return res.json({ ok: true, redirectTo: "/meandersuite/suite" });
  } catch (error) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
});

export default router;

import bcrypt from "bcryptjs";
import express from "express";
import { loginLimiter } from "../config.js";
import {
  clearPortalCookie,
  createPortalToken,
  requirePortalAuth,
  setPortalCookie
} from "../middleware/auth.js";
import User from "../models/User.js";
import { sanitizeUser, validatePassword, validateUsername } from "../helpers/portal-data.js";

const router = express.Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function redirectForRole(user) {
  return user.role === "admin" ? "/clientportal/admin" : "/clientportal/client";
}

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user || !user.active) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({
        error: "Account temporarily locked. Please try again later."
      });
    }

    if (!await bcrypt.compare(password, user.passwordHash)) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginCount = 0;
      }
      await user.save();
      return res.status(401).json({ error: "Invalid username or password" });
    }

    user.failedLoginCount = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    setPortalCookie(res, createPortalToken(user));
    return res.json({
      ok: true,
      user: sanitizeUser(user),
      redirectTo: redirectForRole(user)
    });
  } catch {
    return res.status(500).json({ error: "Unable to complete sign in" });
  }
});

router.post("/logout", requirePortalAuth, (req, res) => {
  clearPortalCookie(res);
  res.json({ ok: true });
});

router.get("/me", requirePortalAuth, (req, res) => {
  res.json({ user: req.portalUser });
});

router.put("/account", requirePortalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.portalUser.id);
    if (!user || !user.active) {
      clearPortalCookie(res);
      return res.status(401).json({ error: "Session is no longer valid" });
    }

    const currentPassword = String(req.body?.currentPassword || "");
    const username = String(req.body?.username || user.username).trim().toLowerCase();
    const password = String(req.body?.newPassword || "");
    const confirmation = String(req.body?.confirmPassword || "");

    if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }

    const duplicate = await User.findOne({ username, _id: { $ne: user._id } });
    if (duplicate) {
      return res.status(409).json({ error: "Username already exists" });
    }

    if (password || confirmation) {
      if (password !== confirmation) {
        return res.status(400).json({ error: "Passwords do not match" });
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      if (await bcrypt.compare(password, user.passwordHash)) {
        return res.status(400).json({
          error: "New password must be different from the current password"
        });
      }
      user.passwordHash = await bcrypt.hash(password, 12);
      user.passwordChangedAt = new Date();
      user.mustChangePassword = false;
    }

    user.username = username;
    await user.save();
    setPortalCookie(res, createPortalToken(user));
    return res.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error("Client Portal account update error:", error);
    return res.status(500).json({ error: "Unable to update account" });
  }
});

export default router;

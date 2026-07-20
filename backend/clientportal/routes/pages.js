import express from "express";
import path from "path";
import { PORTAL_BASE_PATH, PORTAL_TEMPLATE_ROOT } from "../config.js";
import { resolvePortalUser } from "../middleware/auth.js";

const router = express.Router();

async function requirePageAuth(req, res, next) {
  const user = await resolvePortalUser(req, res);
  if (!user) {
    const target = encodeURIComponent(req.originalUrl || `${PORTAL_BASE_PATH}/client`);
    return res.redirect(`${PORTAL_BASE_PATH}/login?next=${target}`);
  }
  req.portalUser = user;
  return next();
}

function redirectForRole(user) {
  return user.role === "admin"
    ? `${PORTAL_BASE_PATH}/admin`
    : `${PORTAL_BASE_PATH}/client`;
}

router.get("/", async (req, res) => {
  const user = await resolvePortalUser(req, res);
  return res.redirect(user ? redirectForRole(user) : `${PORTAL_BASE_PATH}/login`);
});

router.get("/login", async (req, res) => {
  const user = await resolvePortalUser(req, res);
  if (user) {
    return res.redirect(redirectForRole(user));
  }
  return res.sendFile(path.join(PORTAL_TEMPLATE_ROOT, "login.html"));
});

router.get("/admin", requirePageAuth, (req, res) => {
  if (req.portalUser.role !== "admin") {
    return res.redirect(`${PORTAL_BASE_PATH}/client`);
  }
  return res.sendFile(path.join(PORTAL_TEMPLATE_ROOT, "admin.html"));
});

router.get("/client", requirePageAuth, (req, res) => {
  if (req.portalUser.role !== "client") {
    return res.redirect(`${PORTAL_BASE_PATH}/admin`);
  }
  return res.sendFile(path.join(PORTAL_TEMPLATE_ROOT, "client.html"));
});

export default router;

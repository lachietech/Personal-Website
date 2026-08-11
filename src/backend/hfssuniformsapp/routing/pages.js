import express from "express";
import path from "path";
import { resolveAuthenticatedUser } from "../middleware/auth.js";

const router = express.Router();
const basePath = "/hfssuniformsapp";

const appDocument = path.resolve(
  import.meta.dirname,
  "../../../../public/hfss-uniforms.html",
);

const appRoutes = [
  "/dashboard",
  "/sales-records",
  "/pos",
  "/receipts",
  "/stock-manager",
  "/access-management",
  "/account",
];
const allowedNextTargets = new Set(["/dashboard", ...appRoutes]);
const allowedAppNextTargets = new Set([...allowedNextTargets].map(toAppPath));

function toAppPath(route) {
  return `${basePath}${route}`;
}

async function requirePageAuth(req, res, next) {
  const user = await resolveAuthenticatedUser(req, res);
  if (!user) {
    const target = encodeURIComponent(
      req.originalUrl || toAppPath("/dashboard"),
    );
    return res.redirect(`${basePath}/signin?next=${target}`);
  }

  req.user = user;
  next();
}

function getSafeNextTarget(nextValue) {
  if (typeof nextValue !== "string") {
    return toAppPath("/dashboard");
  }

  const trimmedValue = nextValue.trim();
  if (
    !allowedNextTargets.has(trimmedValue) &&
    !allowedAppNextTargets.has(trimmedValue)
  ) {
    return toAppPath("/dashboard");
  }

  return trimmedValue.startsWith(basePath)
    ? trimmedValue
    : toAppPath(trimmedValue);
}

router.get("/", async (req, res) => {
  const user = await resolveAuthenticatedUser(req, res);
  if (!user) {
    return res.redirect(`${basePath}/signin`);
  }
  return res.redirect(toAppPath("/dashboard"));
});

router.get("/signin", async (req, res) => {
  const user = await resolveAuthenticatedUser(req, res);
  if (user) {
    const nextTarget = getSafeNextTarget(req.query.next);
    return res.redirect(nextTarget);
  }

  return res.sendFile(appDocument);
});

router.get("/monthly-update", requirePageAuth, (req, res) => {
  res.redirect(toAppPath("/sales-records"));
});

for (const route of appRoutes) {
  router.get(route, requirePageAuth, (req, res) => {
    res.sendFile(appDocument);
  });
}

export default router;

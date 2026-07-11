import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const PORTAL_AUTH_COOKIE = "client_portal_session";
const COOKIE_PATH = "/clientportal";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    throw new Error("JWT_SECRET or SECRET_KEY is required for Client Portal auth");
  }
  return secret;
}

export function createPortalToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
      clientId: user.clientId?.toString() || null
    },
    getJwtSecret(),
    { expiresIn: process.env.CLIENT_PORTAL_AUTH_TTL || "8h" }
  );
}

export function setPortalCookie(res, token) {
  res.cookie(PORTAL_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8,
    path: COOKIE_PATH
  });
}

export function clearPortalCookie(res) {
  res.clearCookie(PORTAL_AUTH_COOKIE, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH
  });
}

export async function resolvePortalUser(req, res = null) {
  try {
    const token = req.cookies?.[PORTAL_AUTH_COOKIE];
    if (!token) {
      return null;
    }

    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.sub).select("username role clientId active mustChangePassword");
    if (!user || !user.active) {
      if (res) {
        clearPortalCookie(res);
      }
      return null;
    }

    return {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      clientId: user.clientId?.toString() || null,
      mustChangePassword: Boolean(user.mustChangePassword)
    };
  } catch (error) {
    if (res) {
      clearPortalCookie(res);
    }
    return null;
  }
}

export async function requirePortalAuth(req, res, next) {
  const user = await resolvePortalUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Session is no longer valid" });
  }

  req.portalUser = user;
  next();
}

export function requirePortalAdmin(req, res, next) {
  if (req.portalUser?.role !== "admin") {
    return res.status(403).json({ error: "Administrator access required" });
  }
  next();
}

export function requirePortalClient(req, res, next) {
  if (req.portalUser?.role !== "client" || !req.portalUser.clientId) {
    return res.status(403).json({ error: "Client access required" });
  }
  next();
}

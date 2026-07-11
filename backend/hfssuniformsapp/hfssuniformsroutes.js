import express from "express";
import path from "path";
import fs from "fs";
import { doubleCsrf } from "csrf-csrf";
import rateLimit from "express-rate-limit";
import salesRoutes from "./routes/sales.js";
import Sales from "./models/Sales.js";
import posProductsRoutes from "./routes/posProducts.js";
import posOrdersRoutes from "./routes/posOrders.js";
import authRoutes from "./routes/auth.js";
import pageRoutes from "./routes/pages.js";
import { requireAuth, requirePasswordChangeResolved } from "./middleware/auth.js";
import { syncPosProductsFromSalesRecords } from "./services/posIntegration.js";
import { uniformsDb } from "../databases.js";

const router = express.Router();
const basePath = "/hfssuniformsapp";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET" && /\.(?:css|js|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/i.test(req.path)
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => req.method === "GET" || req.path === "/logout",
  message: { error: "Too many sign in attempts. Please try again later." }
});

const uniformsApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});

async function loadSalesData() {
  try {
    const jsonPath = path.join(import.meta.dirname, "sales.json");
    if (!fs.existsSync(jsonPath)) {
      return;
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const months = jsonData.months;
    const count = await Sales.countDocuments({});

    if (count === 0) {
      const salesRecords = [];
      for (const product of jsonData.products) {
        for (const sizeObj of product.sizes) {
          salesRecords.push({
            category: product.category,
            size: sizeObj.size,
            months,
            sales: sizeObj.sales
          });
        }
      }
      await Sales.insertMany(salesRecords);
      console.log(`Loaded ${salesRecords.length} HFSS uniforms sales records`);
    }
  } catch (error) {
    console.error("Error loading HFSS uniforms sales data:", error.message);
  }
}

uniformsDb.once("connected", () => {
  loadSalesData();
  syncPosProductsFromSalesRecords().catch((error) => {
    console.error("Unable to sync HFSS uniforms POS products from sales records:", error.message);
  });
});

router.use(express.static(path.join(import.meta.dirname, "../../public/static/hfssuniformsapp")));
router.use(generalLimiter);

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.sessionID,
  cookieName: "uniform_shop_csrf_secret",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: basePath
  },
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"]
});

function exposeCsrfToken(req, res) {
  req.session.csrfReady = true;
  const csrfToken = generateCsrfToken(req, res);
  res.cookie("uniform_shop_csrf_token", csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: basePath
  });
  res.setHeader("X-CSRF-Token", csrfToken);
  return csrfToken;
}

function saveSession(req, res, next) {
  req.session.save((error) => {
    if (error) {
      next(error);
      return;
    }

    next();
  });
}

router.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.path !== "/api/csrf-token") {
      exposeCsrfToken(req, res);
      saveSession(req, res, next);
      return;
    }
    next();
    return;
  }

  doubleCsrfProtection(req, res, next);
});

router.get("/api/csrf-token", (req, res) => {
  const csrfToken = exposeCsrfToken(req, res);
  req.session.save((error) => {
    if (error) {
      res.status(500).json({ error: "Unable to create CSRF token" });
      return;
    }

    res.json({ csrfToken });
  });
});

router.use(pageRoutes);
router.use("/api/auth", authLimiter, authRoutes);
router.use("/api", uniformsApiLimiter, requireAuth, requirePasswordChangeResolved, salesRoutes);
router.use("/api/pos/products", uniformsApiLimiter, requireAuth, requirePasswordChangeResolved, posProductsRoutes);
router.use("/api/pos/orders", uniformsApiLimiter, requireAuth, requirePasswordChangeResolved, posOrdersRoutes);

router.use((error, req, res, next) => {
  if (error?.code === "EBADCSRFTOKEN" || error?.code === "INVALID_CSRF_TOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  return next(error);
});

export default router;

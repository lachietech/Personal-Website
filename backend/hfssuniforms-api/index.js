import express from "express";
import {
  requireAuth,
  requirePasswordChangeResolved,
} from "./middleware/auth.js";
import {
  csrfErrorHandler,
  csrfTokenRoute,
  protectFromCsrf,
} from "./middleware/csrf.js";
import {
  authLimiter,
  generalLimiter,
  uniformsApiLimiter,
} from "./middleware/rateLimits.js";
import authRoutes from "./routing/auth.js";
import posOrdersRoutes from "./routing/posOrders.js";
import posProductsRoutes from "./routing/posProducts.js";
import salesRoutes from "./routing/sales.js";

export { initialiseUniforms as initialise } from "./services/bootstrap.js";

const router = express.Router();
router.use(generalLimiter, protectFromCsrf);
router.get("/api/csrf-token", csrfTokenRoute);
router.use("/api/auth", authLimiter, authRoutes);

// Apply authentication and the API budget once, including for nested POS routes.
router.use(
  "/api",
  uniformsApiLimiter,
  requireAuth,
  requirePasswordChangeResolved,
);
router.use("/api", salesRoutes);
router.use("/api/pos/products", posProductsRoutes);
router.use("/api/pos/orders", posOrdersRoutes);
router.use(csrfErrorHandler);

export default router;

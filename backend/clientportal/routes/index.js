import express from "express";
import { preventCaching } from "../config.js";
import { initialiseAdminBootstrap } from "../services/adminBootstrap.js";
import adminRoutes from "./admin.js";
import authRoutes from "./auth.js";
import bookkeepingRoutes from "./bookkeeping.js";
import clientRoutes from "./client.js";
import pageRoutes from "./pages.js";

initialiseAdminBootstrap();

const router = express.Router();
router.use(preventCaching);
router.use(pageRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/bookkeeping", bookkeepingRoutes);
router.use("/api/client", clientRoutes);

export default router;

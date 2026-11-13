import express from "express";
import { preventCaching } from "../../shared/middleware/cache.js";
import adminRoutes from "./admin.js";
import authRoutes from "./auth.js";
import bookkeepingRoutes from "./bookkeeping.js";
import clientRoutes from "./client.js";
import projectRoutes from "./projects.js";

const router = express.Router();
router.use(preventCaching);
router.use("/api/projects", projectRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/bookkeeping", bookkeepingRoutes);
router.use("/api/client", clientRoutes);

export default router;

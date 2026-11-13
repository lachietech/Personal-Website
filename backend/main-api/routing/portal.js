import express from "express";
import { preventCaching } from "../../shared/middleware/cache.js";
import adminRoutes from "./admin.js";
import authRoutes from "./auth.js";
import clientRoutes from "./client.js";

const router = express.Router();
router.use(preventCaching);
router.use("/api/auth", authRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/client", clientRoutes);

export default router;

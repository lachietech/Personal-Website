import express from "express";
import authRoutes from "./auth.js";
import suiteRoutes from "./suite.js";

const router = express.Router();
router.use("/api/auth", authRoutes);
router.use("/api", suiteRoutes);

export default router;

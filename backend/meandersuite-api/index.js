import express from "express";
import authRoutes from "./routing/auth.js";
import suiteRoutes from "./routing/suite.js";

const router = express.Router();
router.use("/api/auth", authRoutes);
router.use("/api", suiteRoutes);

export default router;

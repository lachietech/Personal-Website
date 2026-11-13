import express from "express";
import { preventCaching } from "../shared/middleware/cache.js";
import projectRoutes from "./routing/projects.js";

const router = express.Router();
router.use(preventCaching, projectRoutes);

export default router;

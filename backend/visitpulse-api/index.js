import express from "express";
import { preventCaching } from "../shared/middleware/cache.js";
import analyticsRoutes from "./routing/analytics.js";

export { initialiseAnalyticsStorage as initialise } from "./services/analyticsStorage.js";

const router = express.Router();
router.use(preventCaching, analyticsRoutes);

export default router;

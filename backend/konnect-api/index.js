import express from "express";
import { preventCaching } from "../shared/middleware/cache.js";
import messageRoutes from "./routing/messages.js";

export { default as publicRouter } from "./routing/contact.js";

const router = express.Router();
router.use(preventCaching, messageRoutes);

export default router;

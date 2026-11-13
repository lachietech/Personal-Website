import express from "express";
import contactRoutes from "./routing/contact.js";
import portalRoutes from "./routing/portal.js";

export { seedDefaultAdmin as initialise } from "./services/adminBootstrap.js";

const router = express.Router();
router.use("/", contactRoutes);
router.use("/clientportal", portalRoutes);

export default router;

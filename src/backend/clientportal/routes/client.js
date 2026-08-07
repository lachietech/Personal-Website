import express from "express";
import { requirePortalAuth, requirePortalClient } from "../middleware/auth.js";
import Client from "../models/Client.js";
import {
  getBillingSettings,
  serializeBilling,
  serializeClient
} from "../helpers/portal-data.js";

const router = express.Router();
router.use(requirePortalAuth, requirePortalClient);

router.get("/dashboard", async (req, res) => {
  const [client, billing] = await Promise.all([
    Client.findById(req.portalUser.clientId),
    getBillingSettings()
  ]);
  if (!client) {
    return res.status(404).json({ error: "Client record not found" });
  }
  return res.json({
    client: serializeClient(client),
    user: req.portalUser,
    billing: serializeBilling(billing)
  });
});

export default router;

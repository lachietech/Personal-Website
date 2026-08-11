import express from "express";
import { getLimiter } from "../../middleware/rateLimits.js";
import UserWeatherRecord from "../models/UserWeatherRecord.js";
import { requireApiAuthentication } from "../middleware/auth.js";
import { getCwisAnalysis } from "../services/cwisService.js";

const router = express.Router();

router.get(
  "/suite-data",
  getLimiter,
  requireApiAuthentication,
  async (req, res) => {
    try {
      const user = await UserWeatherRecord.findOne({
        username: req.session.username,
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(await getCwisAnalysis(user));
    } catch (error) {
      console.error("Meander Suite data error:", error.message);
      return res
        .status(500)
        .json({ error: "Unable to load current conditions" });
    }
  },
);

export default router;

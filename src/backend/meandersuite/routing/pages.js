import express from "express";
import path from "node:path";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();
const documentPath = path.resolve(
  import.meta.dirname,
  "../../../../public/meander-suite.html",
);

router.get("/", (req, res) => res.sendFile(documentPath));
router.get("/login", (req, res) => res.sendFile(documentPath));
router.get("/register", (req, res) => res.sendFile(documentPath));
router.get("/suite", isAuthenticated, (req, res) => res.sendFile(documentPath));

export default router;

import express from "express";
import path from "node:path";

export function createPageRoutes(documentDirectory) {
  const router = express.Router();
  const document = (name) => (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.join(documentDirectory, name), { cacheControl: false });
  };
  router.get("/", document("index.html"));
  router.get(
    [
      "/clientportal",
      "/clientportal/login",
      "/clientportal/account",
      "/clientportal/admin",
      "/clientportal/client",
    ],
    document("clientportal.html"),
  );
  router.get("/clientportal/billing", document("billing.html"));
  router.get("/clientportal/konnect", document("konnect.html"));
  router.get("/clientportal/visitpulse", document("visitpulse.html"));
  router.get(
    [
      "/meandersuite",
      "/meandersuite/login",
      "/meandersuite/register",
      "/meandersuite/suite",
    ],
    document("meander-suite.html"),
  );
  router.get("/hfssuniformsapp", (_req, res) =>
    res.redirect("/hfssuniformsapp/dashboard"),
  );
  router.get("/hfssuniformsapp/monthly-update", (_req, res) =>
    res.redirect("/hfssuniformsapp/sales-records"),
  );
  router.get(
    [
      "signin",
      "dashboard",
      "sales-records",
      "pos",
      "receipts",
      "stock-manager",
      "access-management",
      "account",
    ].map((route) => `/hfssuniformsapp/${route}`),
    document("hfss-uniforms.html"),
  );
  return router;
}

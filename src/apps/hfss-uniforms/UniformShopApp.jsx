import { LegacyApplication } from "../shared/LegacyApplication.jsx";
import { SignInPage } from "./pages/SignInPage.jsx";

const applicationScripts = [
  "/hfssuniformsapp/js/core.js",
  "/hfssuniformsapp/js/dashboard.js",
  "/hfssuniformsapp/js/sales.js",
  { src: "/hfssuniformsapp/js/pos.js", type: "module" },
  "/hfssuniformsapp/js/receipts.js",
  "/hfssuniformsapp/js/stock.js",
  "/hfssuniformsapp/js/access.js",
  "/hfssuniformsapp/js/navigation.js",
  "/hfssuniformsapp/js/auth.js",
  "/hfssuniformsapp/js/app.js",
];

export function UniformShopApp({ snapshot }) {
  if (window.location.pathname === "/hfssuniformsapp/signin") {
    return <SignInPage />;
  }

  return (
    <LegacyApplication
      name="HFSS Uniform Shop"
      snapshot={snapshot}
      scripts={applicationScripts}
    />
  );
}

import { LandingPage } from "./pages/LandingPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { SuitePage } from "./pages/SuitePage.jsx";
import { pagePath } from "../../pagePath.js";

export function MeanderSuiteApp() {
  const page = pagePath(window.location.pathname)
    .replace(/^\/meandersuite\/?/, "")
    .split("/")[0];
  if (page === "login") return <LoginPage />;
  if (page === "register") return <RegisterPage />;
  if (page === "suite") return <SuitePage />;
  return <LandingPage />;
}

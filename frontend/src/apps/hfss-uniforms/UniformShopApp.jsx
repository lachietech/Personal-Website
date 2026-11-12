import { AuthenticatedApp } from "./AuthenticatedApp.jsx";
import { SignInPage } from "./pages/SignInPage.jsx";
import { pagePath } from "../../pagePath.js";

export function UniformShopApp() {
  if (pagePath(window.location.pathname) === "/hfssuniformsapp/signin") {
    return <SignInPage />;
  }
  return <AuthenticatedApp />;
}

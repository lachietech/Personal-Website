import { AuthenticatedApp } from "./AuthenticatedApp.jsx";
import { SignInPage } from "./pages/SignInPage.jsx";

export function UniformShopApp() {
  if (window.location.pathname === "/hfssuniformsapp/signin") {
    return <SignInPage />;
  }
  return <AuthenticatedApp />;
}

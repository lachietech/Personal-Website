import { PortalSession } from "./components/PortalSession.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { ApplicationsPage } from "./pages/ApplicationsPage.jsx";
import { AccountPage } from "./pages/AccountPage.jsx";
import { pagePath } from "../../pagePath.js";
export function ClientPortalApp() {
  const pathname = pagePath(window.location.pathname);
  if (["/clientportal/admin", "/clientportal/client"].includes(pathname)) {
    window.location.replace("/clientportal/billing");
    return null;
  }
  const login = pathname === "/clientportal/login";
  return (
    <PortalSession login={login}>
      {(user, setUser) =>
        login ? (
          <LoginPage />
        ) : pathname === "/clientportal/account" ? (
          <AccountPage user={user} setUser={setUser} />
        ) : (
          <ApplicationsPage user={user} />
        )
      }
    </PortalSession>
  );
}

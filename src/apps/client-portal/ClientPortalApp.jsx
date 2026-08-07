import { AdminPage } from "./pages/AdminPage.jsx";
import { ClientPage } from "./pages/ClientPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";

export function ClientPortalApp() {
  const pathname = window.location.pathname;

  if (pathname === "/clientportal/admin") {
    return <AdminPage />;
  }

  if (pathname === "/clientportal/client") {
    return <ClientPage />;
  }

  return <LoginPage />;
}

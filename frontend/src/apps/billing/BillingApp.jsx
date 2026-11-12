import { PortalSession } from "../client-portal/components/PortalSession.jsx";
import { AdminPage } from "../client-portal/pages/AdminPage.jsx";
import { ClientPage } from "../client-portal/pages/ClientPage.jsx";
export function BillingApp() {
  return (
    <PortalSession>
      {(user) => (user.role === "admin" ? <AdminPage /> : <ClientPage />)}
    </PortalSession>
  );
}

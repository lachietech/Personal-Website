import { AccountForm } from "../components/AccountForm.jsx";
import { PortalLayout } from "../components/PortalLayout.jsx";
export function AccountPage({ user, setUser }) {
  return (
    <PortalLayout
      eyebrow="Your account"
      title="Account settings"
      subtitle="Manage your sign-in details across your applications."
      className="account-dashboard"
    >
      <section className="invoice-panel">
        <AccountForm user={user} onUpdated={setUser} />
      </section>
    </PortalLayout>
  );
}

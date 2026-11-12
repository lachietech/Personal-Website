import { AccountForm } from "../components/AccountForm.jsx";
import { PortalLayout } from "../components/PortalLayout.jsx";
export function AccountPage({ user, setUser }) {
  return (
    <PortalLayout
      eyebrow="Your account"
      title="Account settings"
      subtitle="Your sign-in details are shared across all three applications."
    >
      <section className="invoice-panel">
        <AccountForm user={user} onUpdated={setUser} />
      </section>
    </PortalLayout>
  );
}

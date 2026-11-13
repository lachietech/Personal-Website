import { useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { useAdminPortal } from "../hooks/useAdminPortal.js";
import { BillingForm } from "../components/BillingForm.jsx";
import { ClientHub } from "../components/ClientHub.jsx";
import { ClientList } from "../components/ClientList.jsx";
import { LogoutButton, PortalLayout } from "../components/PortalLayout.jsx";

export function AdminPage({ user }) {
  const portal = useAdminPortal();
  const [createClient, setCreateClient] = useState(false);

  async function logout() {
    await portalRequest("/clientportal/api/auth/logout", {
      method: "POST",
    }).catch(() => {});
    window.location.assign("/clientportal/login");
  }

  function selectClient(clientId) {
    portal.setSelectedClientId(clientId);
    setCreateClient(false);
  }

  function deleteClient(clientId) {
    portal.setClients((current) =>
      current.filter((client) => client.id !== clientId),
    );
    portal.setSelectedClientId(null);
    setCreateClient(true);
  }

  return (
    <PortalLayout
      className="admin-dashboard"
      eyebrow="Clients & payments"
      title="Client portal"
      subtitle="Client accounts, invoices and payment settings in one workspace."
      actions={
        <>
          <a className="home-link" href="/clientportal/account">
            Account
          </a>
          <LogoutButton onLogout={logout} />
        </>
      }
    >
      {user?.mustChangePassword && (
        <section className="notice warning">
          Update the temporary administrator password in Account settings.
        </section>
      )}
      {portal.loading ? (
        <p className="portal-loading" role="status">
          Loading client accounts...
        </p>
      ) : portal.error ? (
        <section className="notice warning" role="alert">
          <p>{portal.error}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={portal.reload}
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          <details className="hub-disclosure portal-payment-settings">
            <summary>
              <span>
                Payment settings
                <small>
                  Business details, bank account and invoice payment terms
                </small>
              </span>
            </summary>
            <BillingForm billing={portal.billing} onSaved={portal.setBilling} />
          </details>
          <section
            className="workspace admin-workspace"
            aria-label="Clients and invoices"
          >
            <ClientList
              clients={portal.clients}
              selectedId={createClient ? null : portal.selectedClientId}
              onSelect={selectClient}
              onCreate={() => setCreateClient(true)}
            />
            <section className="admin-panels">
              <ClientHub
                key={createClient ? "new-client" : portal.selectedClientId}
                client={portal.selectedClient}
                invoice={portal.selectedInvoice}
                billing={portal.billing}
                onSelectInvoice={portal.setSelectedInvoiceId}
                onClientUpdated={portal.replaceClient}
                createMode={createClient || !portal.selectedClient}
                onCancel={
                  portal.selectedClient
                    ? () => setCreateClient(false)
                    : undefined
                }
                onSaved={(client) => {
                  portal.replaceClient(client);
                  setCreateClient(false);
                }}
                onDeleted={deleteClient}
              />
            </section>
          </section>
        </>
      )}
    </PortalLayout>
  );
}

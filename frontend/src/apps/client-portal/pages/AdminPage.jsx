import { useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { useAdminPortal } from "../hooks/useAdminPortal.js";
import { AccountForm } from "../components/AccountForm.jsx";
import { BillingForm } from "../components/BillingForm.jsx";
import { BookkeepingPanel } from "../components/BookkeepingPanel.jsx";
import { ClientHub } from "../components/ClientHub.jsx";
import { ClientList } from "../components/ClientList.jsx";
import {
  LogoutButton,
  PortalLayout,
  Tabs,
} from "../components/PortalLayout.jsx";
import { ProjectManager } from "../components/ProjectManager.jsx";

const tabs = [
  { id: "clients", label: "Clients & invoices", icon: "bi-people" },
  { id: "projects", label: "Projects", icon: "bi-kanban" },
  { id: "bookkeeping", label: "Bookkeeping", icon: "bi-journal-text" },
  { id: "billing", label: "Payment settings", icon: "bi-bank" },
];

export function AdminPage() {
  const portal = useAdminPortal();
  const [activeTab, setActiveTab] = useState("clients");
  const [showAccount, setShowAccount] = useState(false);
  const [createClient, setCreateClient] = useState(false);
  const usesClientSidebar = !showAccount && activeTab === "clients";
  const billingVisible = !showAccount;

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

  if (portal.error) {
    return <div className="notice warning">{portal.error}</div>;
  }

  if (portal.loading) {
    return <div className="portal-loading">Loading administration portal…</div>;
  }

  return (
    <PortalLayout
      className="admin-dashboard"
      eyebrow="Administration"
      title={showAccount ? "Account settings" : "Billing"}
      subtitle={
        showAccount
          ? "Manage your sign-in details and password."
          : "Clients, invoices and business finances."
      }
      actions={
        <>
          <button
            className="home-link"
            type="button"
            aria-pressed={showAccount}
            onClick={() => setShowAccount((current) => !current)}
          >
            Account
          </button>
          <LogoutButton onLogout={logout} />
        </>
      }
    >
      {portal.user?.mustChangePassword && (
        <section className="notice warning">
          Update the temporary administrator password in Account settings.
        </section>
      )}

      {billingVisible && (
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      )}

      <section
        className={`workspace admin-workspace${
          usesClientSidebar ? "" : " portal-wide"
        }`}
      >
        {usesClientSidebar && (
          <ClientList
            clients={portal.clients}
            selectedId={
              billingVisible && createClient ? null : portal.selectedClientId
            }
            onSelect={selectClient}
            onCreate={() => {
              setCreateClient(true);
              setActiveTab("clients");
            }}
          />
        )}

        <section className="admin-panels">
          {billingVisible && activeTab === "clients" && (
            <ClientHub
              key={createClient ? "new-client" : portal.selectedClientId}
              client={portal.selectedClient}
              invoice={portal.selectedInvoice}
              billing={portal.billing}
              onSelectInvoice={portal.setSelectedInvoiceId}
              onClientUpdated={portal.replaceClient}
              createMode={createClient || !portal.selectedClient}
              onCancel={
                portal.selectedClient ? () => setCreateClient(false) : undefined
              }
              onSaved={(client) => {
                portal.replaceClient(client);
                setCreateClient(false);
              }}
              onDeleted={deleteClient}
            />
          )}

          {billingVisible && activeTab === "projects" && (
            <ProjectManager
              projects={portal.projects}
              setProjects={portal.setProjects}
            />
          )}

          {billingVisible && activeTab === "bookkeeping" && (
            <BookkeepingPanel
              data={portal.bookkeeping}
              setData={portal.setBookkeeping}
            />
          )}

          {billingVisible && activeTab === "billing" && (
            <BillingForm billing={portal.billing} onSaved={portal.setBilling} />
          )}

          {showAccount && (
            <section className="invoice-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Security</p>
                  <h2>Admin account</h2>
                </div>
              </div>
              <AccountForm user={portal.user} onUpdated={portal.setUser} />
            </section>
          )}
        </section>
      </section>
    </PortalLayout>
  );
}

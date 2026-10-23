import { useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { useAdminPortal } from "../hooks/useAdminPortal.js";
import { AccountForm } from "../components/AccountForm.jsx";
import { AnalyticsPanel } from "../components/AnalyticsPanel.jsx";
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
  { id: "clients", label: "Client hub", icon: "bi-people" },
  { id: "projects", label: "Projects", icon: "bi-kanban" },
  { id: "analytics", label: "Analytics", icon: "bi-graph-up-arrow" },
  { id: "bookkeeping", label: "Bookkeeping", icon: "bi-journal-text" },
  { id: "billing", label: "Billing", icon: "bi-bank" },
  { id: "security", label: "Security", icon: "bi-shield-lock" },
];

export function AdminPage() {
  const portal = useAdminPortal();
  const [activeTab, setActiveTab] = useState("clients");
  const [createClient, setCreateClient] = useState(false);
  const usesClientSidebar = activeTab === "clients";

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
      title={tabs.find((tab) => tab.id === activeTab).label}
      subtitle={
        activeTab === "clients"
          ? "Client accounts, invoices and email in one place."
          : undefined
      }
      actions={<LogoutButton onLogout={logout} />}
    >
      {portal.user?.mustChangePassword && (
        <section className="notice warning">
          Update the temporary administrator password in Security.
        </section>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <section
        className={`workspace admin-workspace${
          usesClientSidebar ? "" : " portal-wide"
        }`}
      >
        {usesClientSidebar && (
          <ClientList
            clients={portal.clients}
            selectedId={createClient ? null : portal.selectedClientId}
            onSelect={selectClient}
            onCreate={() => {
              setCreateClient(true);
              setActiveTab("clients");
            }}
          />
        )}

        <section className="admin-panels">
          {activeTab === "clients" && (
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

          {activeTab === "projects" && (
            <ProjectManager
              projects={portal.projects}
              setProjects={portal.setProjects}
            />
          )}

          {activeTab === "analytics" && <AnalyticsPanel />}

          {activeTab === "bookkeeping" && (
            <BookkeepingPanel
              data={portal.bookkeeping}
              setData={portal.setBookkeeping}
            />
          )}

          {activeTab === "billing" && (
            <BillingForm billing={portal.billing} onSaved={portal.setBilling} />
          )}

          {activeTab === "security" && (
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

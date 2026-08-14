import { useEffect, useMemo, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import {
  amountOwing,
  formatDate,
  invoiceTotal,
  money,
  printInvoice,
} from "../utils/portalUtils.js";
import { AccountForm } from "../components/AccountForm.jsx";
import { InvoiceDetail } from "../components/InvoiceDetail.jsx";
import {
  LogoutButton,
  PortalLayout,
  Tabs,
} from "../components/PortalLayout.jsx";

const tabs = [
  { id: "invoices", label: "Invoices", icon: "bi-receipt" },
  { id: "account", label: "Account", icon: "bi-shield-lock" },
];

export function ClientPage() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [activeTab, setActiveTab] = useState("invoices");
  const [error, setError] = useState("");

  useEffect(() => {
    portalRequest("/clientportal/api/client/dashboard")
      .then((data) => {
        setDashboard(data);
        setSelectedInvoiceId(data.client.invoices[0]?.id || null);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const selectedInvoice = useMemo(() => {
    return dashboard?.client.invoices.find(
      (invoice) => invoice.id === selectedInvoiceId,
    );
  }, [dashboard, selectedInvoiceId]);

  async function logout() {
    await portalRequest("/clientportal/api/auth/logout", {
      method: "POST",
    }).catch(() => {});
    window.location.assign("/clientportal/login");
  }

  if (error) {
    return <div className="notice warning">{error}</div>;
  }

  if (!dashboard) {
    return <div className="portal-loading">Loading your portal…</div>;
  }

  const { client, billing } = dashboard;
  const openInvoices = client.invoices.filter(
    (invoice) => invoice.status !== "paid",
  );
  const paidInvoices = client.invoices.filter(
    (invoice) => invoice.status === "paid",
  );
  const nextDue = [...openInvoices].sort((a, b) =>
    a.due.localeCompare(b.due),
  )[0];

  return (
    <PortalLayout
      eyebrow="Client Portal"
      title={`Welcome, ${client.contact}.`}
      subtitle="Review your account, invoices, and payment status whenever you need them."
      actions={
        <>
          <button
            className="icon-button"
            type="button"
            title="Print selected invoice"
            aria-label="Print selected invoice"
            onClick={printInvoice}
          >
            <i className="bi bi-printer" aria-hidden="true" />
          </button>
          <LogoutButton onLogout={logout} />
        </>
      }
    >
      {dashboard.user.mustChangePassword && (
        <section className="notice warning">
          Please update your temporary password in the Account tab.
        </section>
      )}

      <section className="summary-grid" aria-label="Account summary">
        <article className="summary-panel primary">
          <span className="summary-label">Total owing</span>
          <strong>{money(amountOwing(client))}</strong>
          <small>
            {nextDue
              ? `Next due ${formatDate(nextDue.due)}`
              : "All invoices paid"}
          </small>
        </article>
        <article className="summary-panel">
          <span className="summary-label">Open invoices</span>
          <strong>{openInvoices.length}</strong>
          <small>{paidInvoices.length} paid invoices</small>
        </article>
        <article className="summary-panel">
          <span className="summary-label">Contact</span>
          <strong>{client.contact}</strong>
          <small>{client.email}</small>
        </article>
      </section>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "invoices" && (
        <section className="workspace client-workspace">
          <aside className="client-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Invoices</p>
                <h2>History</h2>
              </div>
            </div>
            <div className="invoice-list">
              {client.invoices.map((invoice) => (
                <button
                  className={`invoice-card${
                    selectedInvoiceId === invoice.id ? " active" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                  key={invoice.id}
                >
                  <strong>{invoice.number}</strong>
                  <span>Due {formatDate(invoice.due)}</span>
                  <div className="invoice-card-footer">
                    <span>{money(invoiceTotal(invoice))}</span>
                    <span className={`status-pill status-${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
          <InvoiceDetail
            client={client}
            invoice={selectedInvoice}
            billing={billing}
          />
        </section>
      )}

      {activeTab === "account" && (
        <section className="invoice-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Security</p>
              <h2>Account</h2>
            </div>
          </div>
          <AccountForm
            user={dashboard.user}
            onUpdated={(user) =>
              setDashboard((current) => ({ ...current, user }))
            }
          />
        </section>
      )}
    </PortalLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import {
  amountOwing,
  formatDate,
  invoiceTotal,
  money,
  printInvoice,
} from "../utils/portalUtils.js";
import { InvoiceDetail } from "../components/InvoiceDetail.jsx";
import { LogoutButton, PortalLayout } from "../components/PortalLayout.jsx";
import { BillingNotifications } from "../components/BillingNotifications.jsx";

export function ClientPage() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
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

  if (!dashboard || error) {
    return (
      <PortalLayout
        eyebrow="Client portal"
        title="Your invoices"
        subtitle="Your invoices, payments and billing notifications."
      >
        {error ? (
          <section className="notice warning" role="alert">
            <p>{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </section>
        ) : (
          <p className="portal-loading" role="status">
            Loading your portal...
          </p>
        )}
      </PortalLayout>
    );
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
      className="client-dashboard"
      eyebrow="Client portal"
      title={`Welcome, ${client.contact}.`}
      subtitle="Your invoices, payments and billing notifications."
      actions={
        <>
          {selectedInvoice && (
            <button
              className="icon-button"
              type="button"
              title="Print selected invoice"
              aria-label="Print selected invoice"
              onClick={printInvoice}
            >
              <i className="bi bi-printer" aria-hidden="true" />
            </button>
          )}
          <a className="home-link" href="/clientportal/account">
            Account
          </a>
          <LogoutButton onLogout={logout} />
        </>
      }
    >
      {dashboard.user.mustChangePassword && (
        <section className="notice warning">
          Please update your temporary password in Account settings.
        </section>
      )}

      <section className="summary-grid" aria-label="Billing summary">
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

      <section className="workspace client-workspace">
        <aside className="client-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Invoices</p>
              <h2>History</h2>
            </div>
          </div>
          <div className="invoice-list">
            {!client.invoices.length && (
              <p className="empty-state">No invoices yet.</p>
            )}
            {client.invoices.map((invoice) => (
              <button
                className={`invoice-card${
                  selectedInvoiceId === invoice.id ? " active" : ""
                }`}
                type="button"
                aria-pressed={selectedInvoiceId === invoice.id}
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

      <BillingNotifications
        client={client}
        onOpenInvoice={(id) => {
          setSelectedInvoiceId(id);
          requestAnimationFrame(() =>
            document.getElementById("invoiceDetail")?.focus(),
          );
        }}
      />
    </PortalLayout>
  );
}

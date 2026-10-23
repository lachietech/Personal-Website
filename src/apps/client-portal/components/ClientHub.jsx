import { useState } from "react";
import { amountOwing, money, printInvoice } from "../utils/portalUtils.js";
import { ClientForm } from "./ClientForm.jsx";
import { EmailPanel } from "./EmailPanel.jsx";
import { InvoiceDetail } from "./InvoiceDetail.jsx";
import { InvoiceForm } from "./InvoiceForm.jsx";

export function ClientHub({
  client,
  invoice,
  billing,
  createMode,
  onSaved,
  onDeleted,
  onCancel,
  onSelectInvoice,
  onClientUpdated,
}) {
  const [creatingInvoice, setCreatingInvoice] = useState(!invoice);
  const savedInvoice = creatingInvoice ? null : invoice;
  const clientForm = (
    <ClientForm
      client={client}
      createMode={createMode}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );

  if (createMode) {
    return (
      <div className="client-hub">
        <div className="hub-intro">
          <p>
            Create the client account first, then manage their invoices and
            emails here.
          </p>
          {onCancel && (
            <button
              className="secondary-button"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
        {clientForm}
      </div>
    );
  }

  return (
    <div className="client-hub">
      <section
        className="invoice-panel hub-overview"
        aria-label="Client overview"
      >
        <div className="hub-identity">
          <div>
            <h2>{client.business}</h2>
            <p className="hub-contact">
              {client.contact} <span aria-hidden="true">·</span> {client.email}
            </p>
          </div>
          <span
            className={`status-pill ${client.userActive !== false ? "status-paid" : "status-draft"}`}
          >
            {client.userActive !== false ? "Active" : "Login disabled"}
          </span>
        </div>
        <dl className="hub-metrics">
          <div>
            <dt>Amount owing</dt>
            <dd>{money(amountOwing(client))}</dd>
          </div>
          <div>
            <dt>Open invoices</dt>
            <dd>
              {client.invoices.filter((item) => item.status !== "paid").length}
            </dd>
          </div>
        </dl>
        <details className="hub-disclosure hub-account-details">
          <summary>
            <span>Manage client details</span>
          </summary>
          {clientForm}
        </details>
      </section>

      <section id="hub-invoices" aria-label="Client invoices">
        <InvoiceForm
          client={client}
          invoice={invoice}
          onSelect={onSelectInvoice}
          onSaved={onClientUpdated}
          onCreateModeChange={setCreatingInvoice}
        />
      </section>

      <section id="hub-emails" aria-label="Client email actions">
        <EmailPanel
          key={`${client.id}-${savedInvoice?.id || "draft"}`}
          client={client}
          invoice={savedInvoice}
          onClientUpdated={onClientUpdated}
        />
      </section>

      {savedInvoice && (
        <details className="hub-disclosure" key={savedInvoice.id}>
          <summary>
            <span>
              Invoice preview{" "}
              <small>{savedInvoice.number} · Saved invoice</small>
            </span>
          </summary>
          <div className="hub-preview-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={printInvoice}
            >
              <i className="bi bi-printer" aria-hidden="true" /> Print invoice
            </button>
          </div>
          <InvoiceDetail
            client={client}
            invoice={savedInvoice}
            billing={billing}
          />
        </details>
      )}
    </div>
  );
}

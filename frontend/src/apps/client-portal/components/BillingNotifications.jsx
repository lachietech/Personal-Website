import { EmailPanel } from "./EmailPanel.jsx";
import { formatDate } from "../utils/portalUtils.js";

export function BillingNotifications({
  client,
  invoice,
  onSelectInvoice,
  onClientUpdated,
  isAdmin = false,
  onOpenInvoice,
}) {
  if (!client) {
    return (
      <section className="invoice-panel empty-state">
        <h2>Billing notifications</h2>
        <p>Select a client to manage their mail and notifications.</p>
      </section>
    );
  }

  const notifications = client.invoices.filter(
    (item) => item.status !== "draft",
  );

  return (
    <div className="mailbox-panel">
      <section className="invoice-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Billing notifications</p>
            <h2>{isAdmin ? client.business : "Your billing updates"}</h2>
          </div>
        </div>
        <p className="hub-contact">
          Mail for <strong>{client.email}</strong>
        </p>
        <p className="hub-email-context">
          Account emails, invoices and payment reminders are delivered to this
          email address. Contact enquiries are available in the separate Konnect
          application.
        </p>
        {isAdmin && (
          <label className="mailbox-invoice-picker">
            Invoice for email notifications
            <select
              value={invoice?.id || ""}
              onChange={(event) => onSelectInvoice(event.target.value)}
              disabled={!client.invoices.length}
            >
              {!client.invoices.length && (
                <option value="">No saved invoices</option>
              )}
              {client.invoices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number} — {item.status}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
      {isAdmin && (
        <EmailPanel
          key={`${client.id}-${invoice?.id || "none"}`}
          client={client}
          invoice={invoice}
          onClientUpdated={onClientUpdated}
        />
      )}
      <section className="invoice-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Notifications</p>
            <h2>Invoice updates</h2>
          </div>
        </div>
        <p className="hub-email-context">
          Current invoice status, independent of email delivery.
        </p>
        {notifications.length ? (
          <ul className="mailbox-notifications">
            {notifications.map((item) => (
              <li key={item.id}>
                <i
                  className={`bi ${item.status === "paid" ? "bi-check-circle" : "bi-receipt"}`}
                  aria-hidden="true"
                />
                <div>
                  <strong>{item.number}</strong>
                  <p>
                    {item.status === "paid"
                      ? "Payment received"
                      : `Payment due ${formatDate(item.due)}`}
                  </p>
                </div>
                <span className={`status-pill status-${item.status}`}>
                  {item.status}
                </span>
                {onOpenInvoice && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onOpenInvoice(item.id)}
                  >
                    View invoice
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hub-contact">No invoice notifications yet.</p>
        )}
      </section>
    </div>
  );
}

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
    <section className="invoice-panel mailbox-panel">
      <div>
        <div className="panel-heading">
          <div>
            <h2>Billing notifications</h2>
          </div>
        </div>
        <p className="hub-contact">
          Mail for <strong>{client.email}</strong>
        </p>
        <p className="hub-email-context">
          Account emails, invoices and payment reminders are delivered to this
          email address.
        </p>
        {isAdmin && (
          <label className="mailbox-invoice-picker">
            Invoice for email notifications
            <select
              value={invoice?.id || ""}
              onChange={(event) => onSelectInvoice(event.target.value)}
              disabled={!client.invoices.length}
            >
              {(!invoice || !client.invoices.length) && (
                <option value="">
                  {client.invoices.length
                    ? "Select a saved invoice"
                    : "No saved invoices"}
                </option>
              )}
              {client.invoices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.number} — {item.status}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {isAdmin && (
        <EmailPanel
          embedded
          key={`${client.id}-${invoice?.id || "none"}`}
          client={client}
          invoice={invoice}
          onClientUpdated={onClientUpdated}
        />
      )}
      <div className="notification-history">
        <div className="panel-heading">
          <div>
            <h3>Invoice updates</h3>
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
      </div>
    </section>
  );
}

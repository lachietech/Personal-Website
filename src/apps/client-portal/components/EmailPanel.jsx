import { useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { FormMessage } from "./PortalLayout.jsx";

export function EmailPanel({ client, invoice, onClientUpdated }) {
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState("");

  async function send(kind) {
    if (!client) return;
    const paths = {
      account: `/clientportal/api/admin/clients/${client.id}/emails/account`,
      invoice: `/clientportal/api/admin/clients/${client.id}/invoices/${invoice?.id}/email`,
      reminder: `/clientportal/api/admin/clients/${client.id}/invoices/${invoice?.id}/reminder`,
      receipt: `/clientportal/api/admin/clients/${client.id}/invoices/${invoice?.id}/receipt`,
    };

    setSending(kind);
    setMessage(null);
    try {
      const data = await portalRequest(paths[kind], {
        method: "POST",
        body: {},
      });
      if (data.client) onClientUpdated(data.client);
      setMessage({ type: "success", text: "Email sent." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSending("");
    }
  }

  if (!client) {
    return (
      <div className="empty-state">Select a client to send notifications.</div>
    );
  }

  return (
    <section className="invoice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Notifications</p>
          <h2>Client emails</h2>
        </div>
      </div>
      <p>
        Send messages to <strong>{client.email}</strong>
        {invoice ? ` about invoice ${invoice.number}.` : "."}
      </p>
      <div className="email-actions">
        <button
          className="action-button"
          type="button"
          disabled={Boolean(sending)}
          onClick={() => send("account")}
        >
          Send account email
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!invoice || Boolean(sending)}
          onClick={() => send("invoice")}
        >
          Send invoice
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!invoice || Boolean(sending)}
          onClick={() => send("reminder")}
        >
          Send reminder
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={invoice?.status !== "paid" || Boolean(sending)}
          onClick={() => send("receipt")}
        >
          Send receipt
        </button>
      </div>
      <FormMessage
        message={sending ? { text: `Sending ${sending} email…` } : message}
      />
    </section>
  );
}

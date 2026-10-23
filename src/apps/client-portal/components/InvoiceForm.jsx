import { useEffect, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import {
  formatDate,
  invoiceTotal,
  money,
  today,
} from "../utils/portalUtils.js";
import { FormMessage } from "./PortalLayout.jsx";

function rowKey() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function emptyInvoice() {
  return {
    number: "",
    status: "draft",
    issued: today(),
    due: today(),
    taxRate: 0.1,
    notes: "",
    items: [{ _key: rowKey(), description: "", quantity: 1, rate: 0 }],
    hours: [],
  };
}

function withKeys(invoice) {
  if (!invoice) return emptyInvoice();
  return {
    ...invoice,
    items: invoice.items.map((item) => ({
      ...item,
      _key: item.id || rowKey(),
    })),
    hours: invoice.hours.map((entry) => ({
      ...entry,
      _key: entry.id || rowKey(),
    })),
  };
}

export function InvoiceForm({
  client,
  invoice,
  onSelect,
  onSaved,
  onCreateModeChange,
}) {
  const [values, setValues] = useState(emptyInvoice);
  const [createMode, setCreateMode] = useState(!invoice);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(!invoice);

  useEffect(() => {
    setValues(withKeys(invoice));
    setCreateMode(!invoice);
    setEditing(!invoice);
    setMessage(null);
  }, [invoice, client?.id]);

  useEffect(() => {
    onCreateModeChange?.(createMode);
  }, [createMode, onCreateModeChange]);

  if (!client) {
    return <div className="empty-state">Select or create a client first.</div>;
  }

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateRow(collection, key, field, value) {
    setValues((current) => ({
      ...current,
      [collection]: current[collection].map((row) =>
        row._key === key ? { ...row, [field]: value } : row,
      ),
    }));
  }

  function removeRow(collection, key) {
    setValues((current) => ({
      ...current,
      [collection]: current[collection].filter((row) => row._key !== key),
    }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const basePath = `/clientportal/api/admin/clients/${client.id}/invoices`;
    try {
      const data = await portalRequest(
        createMode ? basePath : `${basePath}/${invoice.id}`,
        {
          method: createMode ? "POST" : "PUT",
          body: {
            ...values,
            items: values.items.map(({ _key, id, ...item }) => item),
            hours: values.hours.map(({ _key, id, ...entry }) => entry),
          },
        },
      );
      if (createMode) {
        const createdInvoice = data.client.invoices.find(
          (item) =>
            !client.invoices.some((existing) => existing.id === item.id),
        );
        if (createdInvoice) onSelect(createdInvoice.id);
      }
      onSaved(data.client);
      setEditing(false);
      setMessage({ type: "success", text: "Invoice saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!invoice || !window.confirm(`Delete invoice ${invoice.number}?`))
      return;
    try {
      const data = await portalRequest(
        `/clientportal/api/admin/clients/${client.id}/invoices/${invoice.id}`,
        { method: "DELETE" },
      );
      onSaved(data.client);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <section className="invoice-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Invoices{" "}
            <span className="client-count">{client.invoices.length}</span>
          </h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={createMode}
          onClick={() => {
            setCreateMode(true);
            setEditing(true);
            setValues(emptyInvoice());
            setMessage(null);
          }}
        >
          New invoice
        </button>
      </div>

      <div className="invoice-list admin-invoice-list">
        {client.invoices.map((item) => (
          <button
            className={`invoice-card${invoice?.id === item.id && !createMode ? " active" : ""}`}
            type="button"
            onClick={() => {
              onSelect(item.id);
              setCreateMode(false);
              setEditing(false);
              setValues(withKeys(item));
              setMessage(null);
            }}
            aria-pressed={invoice?.id === item.id && !createMode}
            key={item.id}
          >
            <strong>{item.number}</strong>
            <span>Due {formatDate(item.due)}</span>
            <div className="invoice-card-footer">
              <span>{money(invoiceTotal(item))}</span>
              <span className={`status-pill status-${item.status}`}>
                {item.status}
              </span>
            </div>
          </button>
        ))}
      </div>

      <details
        className="hub-invoice-editor"
        open={editing}
        onToggle={(event) => setEditing(event.currentTarget.open)}
      >
        <summary>
          {createMode ? "Create invoice" : `Edit ${invoice.number}`}
        </summary>
        <form className="stack-form" onSubmit={save}>
          <div className="form-grid">
            <label>
              Invoice number
              <input
                value={values.number}
                onChange={(event) => update("number", event.target.value)}
                required
              />
            </label>
            <label>
              Status
              <select
                value={values.status}
                onChange={(event) => update("status", event.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label>
              Issued
              <input
                type="date"
                value={values.issued}
                onChange={(event) => update("issued", event.target.value)}
                required
              />
            </label>
            <label>
              Due
              <input
                type="date"
                value={values.due}
                onChange={(event) => update("due", event.target.value)}
                required
              />
            </label>
            <label>
              GST rate
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={values.taxRate}
                onChange={(event) => update("taxRate", event.target.value)}
              />
            </label>
          </div>

          <div className="editor-heading">
            <h3>Line items</h3>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                update("items", [
                  ...values.items,
                  { _key: rowKey(), description: "", quantity: 1, rate: 0 },
                ])
              }
            >
              Add line
            </button>
          </div>
          <div className="line-items-editor">
            {values.items.map((item) => (
              <div className="line-item-row" key={item._key}>
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(event) =>
                    updateRow(
                      "items",
                      item._key,
                      "description",
                      event.target.value,
                    )
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(event) =>
                    updateRow(
                      "items",
                      item._key,
                      "quantity",
                      event.target.value,
                    )
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(event) =>
                    updateRow("items", item._key, "rate", event.target.value)
                  }
                  required
                />
                <button
                  className="icon-button danger-icon"
                  type="button"
                  onClick={() => removeRow("items", item._key)}
                  aria-label="Remove line item"
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <div className="editor-heading">
            <h3>Hours breakdown</h3>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                update("hours", [
                  ...values.hours,
                  { _key: rowKey(), date: today(), hours: 1, work: "" },
                ])
              }
            >
              Add hours
            </button>
          </div>
          <div className="hours-editor">
            {values.hours.map((entry) => (
              <div className="hour-entry-row" key={entry._key}>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(event) =>
                    updateRow("hours", entry._key, "date", event.target.value)
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={entry.hours}
                  onChange={(event) =>
                    updateRow("hours", entry._key, "hours", event.target.value)
                  }
                  required
                />
                <input
                  value={entry.work}
                  placeholder="Work completed"
                  onChange={(event) =>
                    updateRow("hours", entry._key, "work", event.target.value)
                  }
                  required
                />
                <button
                  className="icon-button danger-icon"
                  type="button"
                  onClick={() => removeRow("hours", entry._key)}
                  aria-label="Remove hours"
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <label>
            Notes
            <textarea
              value={values.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="action-button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save invoice"}
            </button>
            {!createMode && (
              <button className="danger-button" type="button" onClick={remove}>
                Delete invoice
              </button>
            )}
          </div>
        </form>
      </details>
      <FormMessage message={message} />
    </section>
  );
}

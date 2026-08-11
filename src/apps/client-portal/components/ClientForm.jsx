import { useEffect, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { FormMessage } from "./PortalLayout.jsx";

const emptyClient = {
  business: "",
  contact: "",
  email: "",
  username: "",
  notes: "",
  userActive: true,
};

export function ClientForm({ client, createMode, onSaved, onDeleted }) {
  const [values, setValues] = useState(emptyClient);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(createMode || !client ? emptyClient : client);
    setMessage(null);
  }, [client, createMode]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const path = createMode
        ? "/clientportal/api/admin/clients"
        : `/clientportal/api/admin/clients/${client.id}`;
      const data = await portalRequest(path, {
        method: createMode ? "POST" : "PUT",
        body: {
          business: values.business,
          contact: values.contact,
          email: values.email,
          username: values.username,
          password: values.password || "",
          notes: values.notes,
          active: values.userActive,
        },
      });
      onSaved(data.client);
      setMessage({ type: "success", text: "Client saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !client ||
      !window.confirm(`Delete ${client.business} and its invoices?`)
    ) {
      return;
    }
    try {
      await portalRequest(`/clientportal/api/admin/clients/${client.id}`, {
        method: "DELETE",
      });
      onDeleted(client.id);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <section className="invoice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Client account</p>
          <h2>{createMode ? "Create client" : values.business}</h2>
        </div>
        {!createMode && client && (
          <button className="danger-button" type="button" onClick={remove}>
            Delete client
          </button>
        )}
      </div>

      <form className="stack-form" onSubmit={save}>
        <div className="form-grid">
          <label>
            Business name
            <input
              value={values.business || ""}
              onChange={(event) => update("business", event.target.value)}
              required
            />
          </label>
          <label>
            Contact name
            <input
              value={values.contact || ""}
              onChange={(event) => update("contact", event.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={values.email || ""}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </label>
          <label>
            Username
            <input
              value={values.username || ""}
              onChange={(event) => update("username", event.target.value)}
              required
            />
          </label>
          <label>
            {createMode ? "Temporary password" : "Reset password (optional)"}
            <input
              type="password"
              value={values.password || ""}
              onChange={(event) => update("password", event.target.value)}
              autoComplete="new-password"
              required={createMode}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={values.userActive !== false}
              onChange={(event) => update("userActive", event.target.checked)}
            />
            Active login
          </label>
        </div>
        <label>
          Notes
          <textarea
            value={values.notes || ""}
            onChange={(event) => update("notes", event.target.value)}
          />
        </label>
        <button className="action-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save client"}
        </button>
        <FormMessage message={message} />
      </form>
    </section>
  );
}

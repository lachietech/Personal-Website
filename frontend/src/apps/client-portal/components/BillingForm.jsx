import { useEffect, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { FormMessage } from "./PortalLayout.jsx";

export function BillingForm({ billing, onSaved }) {
  const [values, setValues] = useState(billing);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValues(billing), [billing]);

  async function save(event) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const data = await portalRequest(
        "/clientportal/api/admin/settings/billing",
        { method: "PUT", body: values },
      );
      onSaved(data.billing);
      setMessage({ type: "success", text: "Payment settings saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="invoice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Business details</p>
          <h2>Invoice and payment settings</h2>
        </div>
      </div>
      <form className="stack-form" onSubmit={save}>
        <div className="form-grid">
          {[
            ["businessName", "Business name"],
            ["abn", "ABN"],
            ["bankName", "Bank name"],
            ["accountName", "Account name"],
            ["bsb", "BSB"],
            ["accountNumber", "Account number"],
            ["paymentReference", "Payment reference"],
          ].map(([field, label]) => (
            <label key={field}>
              {label}
              <input
                value={values[field] || ""}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <label>
          Payment terms
          <textarea
            value={values.paymentTerms || ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                paymentTerms: event.target.value,
              }))
            }
          />
        </label>
        <div className="form-actions">
          <button className="action-button" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save payment settings"}
          </button>
        </div>
        <FormMessage message={message} />
      </form>
    </section>
  );
}

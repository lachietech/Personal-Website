import { useEffect, useState } from "react";
import { portalRequest } from "../portalApi.js";
import { FormMessage } from "./PortalLayout.jsx";

export function BillingForm({ billing, onSaved }) {
  const [values, setValues] = useState(billing);
  const [message, setMessage] = useState(null);

  useEffect(() => setValues(billing), [billing]);

  async function save(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const data = await portalRequest(
        "/clientportal/api/admin/settings/billing",
        { method: "PUT", body: values },
      );
      onSaved(data.billing);
      setMessage({ type: "success", text: "Billing details saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <section className="invoice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Payment details</p>
          <h2>ABN and bank details</h2>
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
        <button className="action-button" type="submit">
          Save billing details
        </button>
        <FormMessage message={message} />
      </form>
    </section>
  );
}

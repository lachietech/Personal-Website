import { useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { FormMessage } from "./PortalLayout.jsx";

export function AccountForm({ user, onUpdated }) {
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const response = await portalRequest("/clientportal/api/auth/account", {
        method: "PUT",
        body: data,
      });
      onUpdated?.(response.user);
      form.reset();
      setMessage({ type: "success", text: "Account updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Username
        <input name="username" defaultValue={user?.username || ""} required />
      </label>
      <label>
        Current password
        <input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        New password
        <input type="password" name="newPassword" autoComplete="new-password" />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
        />
      </label>
      <button className="action-button" type="submit" disabled={saving}>
        <i className="bi bi-shield-lock" aria-hidden="true" />
        {saving ? "Updating…" : "Update account"}
      </button>
      <FormMessage message={message} />
    </form>
  );
}

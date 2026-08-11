import { useState } from "react";
import { CredentialField } from "../components/CredentialField.jsx";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { uniformRequest } from "../api/uniformApi.js";

export function AccountPage({ user, onUserUpdated }) {
  const [fields, setFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState(null);

  async function submit(event) {
    event.preventDefault();
    try {
      const result = await uniformRequest("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      setFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ type: "success", text: "Password changed successfully." });
      onUserUpdated(result.user);
    } catch (requestError) {
      setMessage({ type: "error", text: requestError.message });
    }
  }

  return (
    <section className="section active">
      <h2>My Account</h2>
      <p>Signed in as {user.username}.</p>
      {user.mustChangePassword && (
        <p className="status-message warning">
          Change your temporary password before using the rest of the
          application.
        </p>
      )}
      <div className="card">
        <h3>Change password</h3>
        <form className="form-grid" onSubmit={submit}>
          <CredentialField
            type="password"
            label="Current password"
            value={fields.currentPassword}
            onChange={(event) =>
              setFields({ ...fields, currentPassword: event.target.value })
            }
            required
          />
          <CredentialField
            type="password"
            label="New password"
            value={fields.newPassword}
            onChange={(event) =>
              setFields({ ...fields, newPassword: event.target.value })
            }
            minLength="12"
            required
          />
          <CredentialField
            type="password"
            label="Confirm new password"
            value={fields.confirmPassword}
            onChange={(event) =>
              setFields({ ...fields, confirmPassword: event.target.value })
            }
            minLength="12"
            required
          />
          <div className="form-actions">
            <button className="btn btn-primary">Change password</button>
          </div>
        </form>
        <StatusMessage message={message} />
      </div>
    </section>
  );
}

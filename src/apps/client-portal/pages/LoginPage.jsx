import { useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { PortalBrand } from "../components/PortalBrand.jsx";

export function LoginPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("Signing in…");

    const formData = new FormData(event.currentTarget);

    try {
      const data = await portalRequest("/clientportal/api/auth/login", {
        method: "POST",
        body: {
          username: formData.get("username"),
          password: formData.get("password"),
        },
      });
      window.location.assign(data.redirectTo || "/clientportal");
    } catch (error) {
      setMessage(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <PortalBrand />
        <p className="eyebrow">Client Portal</p>
        <h1>Sign in</h1>
        <p className="login-copy">
          Access invoices, balances, and client billing updates.
        </p>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            className="action-button"
            type="submit"
            disabled={isSubmitting}
          >
            <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
          <p
            className={`form-message${message && !isSubmitting ? " error" : ""}`}
            role="status"
          >
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}

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
      <section className="login-intro" aria-label="Portal features">
        <span className="login-kicker">
          <i className="bi bi-shield-check" aria-hidden="true" />
          Private client workspace
        </span>
        <div>
          <p className="eyebrow">Nielsen Innovations</p>
          <h2>Everything important, in one clear place.</h2>
          <p>
            Keep track of invoices, balances, and account details without the
            back-and-forth.
          </p>
        </div>
        <ul className="login-feature-list">
          <li>
            <i className="bi bi-receipt" aria-hidden="true" /> Invoice history
          </li>
          <li>
            <i className="bi bi-wallet2" aria-hidden="true" /> Live balances
          </li>
          <li>
            <i className="bi bi-lock" aria-hidden="true" /> Secure access
          </li>
        </ul>
      </section>
      <section className="login-panel">
        <PortalBrand />
        <p className="eyebrow">Client Portal</p>
        <h1>Welcome back</h1>
        <p className="login-copy">
          Sign in to continue to your workspace.
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

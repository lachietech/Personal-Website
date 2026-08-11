import { useState } from "react";
import { meanderRequest } from "../api/meanderApi.js";

export function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await meanderRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      window.location.assign(result.redirectTo);
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }
  return (
    <main className="meander-form-page">
      <section className="meander-card meander-form">
        <a href="/meandersuite">
          <img
            className="meander-logo"
            src="/static/meandersuiteprerelease/mainfiles/logoblack.png"
            alt="Meander Suite"
          />
        </a>
        <h1>Sign in</h1>
        <form className="meander-form-grid" onSubmit={submit}>
          <label className="meander-field">
            Username
            <input name="username" autoComplete="username" required />
          </label>
          <label className="meander-field">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="meander-status" role="alert">
              {error}
            </p>
          )}
          <button className="meander-button" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p>
          New to Meander Suite?{" "}
          <a href="/meandersuite/register">Create an account</a>.
        </p>
      </section>
    </main>
  );
}

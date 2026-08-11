import { useState } from "react";
import { meanderRequest } from "../api/meanderApi.js";

const stepFields = [
  [
    ["first_name", "First name", "text"],
    ["last_name", "Last name", "text"],
    ["email", "Email address", "email"],
  ],
  [
    ["locationc", "Country", "text"],
    ["locations", "State", "text"],
    ["locationl", "Suburb or city", "text"],
  ],
  [
    ["username", "Username", "text"],
    ["password", "Password", "password"],
    ["passwordconf", "Confirm password", "password"],
  ],
];

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }
  function next(event) {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) {
      setError("");
      setStep((current) => Math.min(2, current + 1));
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (values.password !== values.passwordconf) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await meanderRequest("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
        <h1>Create your account</h1>
        <div className="meander-progress" aria-label={`Step ${step + 1} of 3`}>
          <span style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
        <form
          className="meander-form-grid"
          onSubmit={step === 2 ? submit : next}
        >
          {stepFields[step].map(([name, label, type]) => (
            <label className="meander-field" key={name}>
              {label}
              <input
                type={type}
                value={values[name] || ""}
                minLength={type === "password" ? 6 : undefined}
                onChange={(event) => update(name, event.target.value)}
                required
              />
            </label>
          ))}
          {error && (
            <p className="meander-status" role="alert">
              {error}
            </p>
          )}
          <div className="meander-actions">
            {step > 0 && (
              <button
                type="button"
                className="meander-button secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button className="meander-button" disabled={submitting}>
              {step === 2
                ? submitting
                  ? "Creating account..."
                  : "Register"
                : "Next"}
            </button>
          </div>
        </form>
        <p>
          Already registered? <a href="/meandersuite/login">Sign in</a>.
        </p>
      </section>
    </main>
  );
}

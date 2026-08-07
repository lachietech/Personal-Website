import { useEffect, useState } from "react";
import { CredentialField } from "../components/CredentialField.jsx";
import { prepareUniformSession, uniformRequest } from "../uniformApi.js";

const BASE_PATH = "/hfssuniformsapp";
const allowedDestinations = new Set([
  `${BASE_PATH}/dashboard`,
  `${BASE_PATH}/sales-records`,
  `${BASE_PATH}/pos`,
  `${BASE_PATH}/receipts`,
  `${BASE_PATH}/stock-manager`,
  `${BASE_PATH}/access-management`,
  `${BASE_PATH}/account`,
]);

function getDestination() {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  return allowedDestinations.has(requestedPath)
    ? requestedPath
    : `${BASE_PATH}/dashboard`;
}

export function SignInPage() {
  const [mode, setMode] = useState("loading");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function initialise() {
      try {
        await prepareUniformSession();

        const sessionResponse = await fetch(`${BASE_PATH}/api/auth/me`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (sessionResponse.ok) {
          window.location.assign(getDestination());
          return;
        }

        const setup = await uniformRequest("/api/auth/setup-status");
        if (isCurrent) {
          setMode(setup.needsSetup ? "setup" : "login");
        }
      } catch {
        if (isCurrent) {
          setMode("login");
          setMessage("Could not connect to the server.");
        }
      }
    }

    initialise();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      await uniformRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      window.location.assign(getDestination());
    } catch (error) {
      setMessage(error.message);
      setIsSubmitting(false);
    }
  }

  async function handleSetup(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      await uniformRequest("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
        }),
      });
      window.location.assign(getDestination());
    } catch (error) {
      setMessage(error.message);
      setIsSubmitting(false);
    }
  }

  const isLoading = mode === "loading";

  return (
    <div id="passwordGate" style={{ display: "flex" }}>
      <div className="password-box">
        <span className="brand-kicker">Harris Fields State School</span>
        <h2>Uniform Shop Manager</h2>

        {isLoading && <p>Checking your session…</p>}

        {mode === "login" && (
          <form id="loginPanel" onSubmit={handleLogin}>
            <p>Sign in once to start your secure session.</p>
            <CredentialField
              label="Username"
              type="text"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
            <CredentialField
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        {mode === "setup" && (
          <form id="setupPanel" onSubmit={handleSetup}>
            <p>Create the first administrator account.</p>
            <CredentialField
              label="Username"
              type="text"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
            <CredentialField
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              required
            />
            <CredentialField
              label="Confirm password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Administrator"}
            </button>
          </form>
        )}

        <p className="password-error" role="status">
          {message}
        </p>
      </div>
    </div>
  );
}

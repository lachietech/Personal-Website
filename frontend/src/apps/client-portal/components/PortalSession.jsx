import { useEffect, useState } from "react";
import { portalRequest } from "../api/portalApi.js";
import { portalDestination } from "../utils/appRoutes.js";

export function PortalSession({ children, login = false }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    portalRequest("/clientportal/api/auth/me")
      .then(({ user: account }) => {
        if (!active) return;
        if (login) {
          window.location.replace(
            portalDestination(
              new URLSearchParams(window.location.search).get("next"),
            ),
          );
        } else {
          setUser(account);
          setReady(true);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) {
          if (login) setReady(true);
          else
            window.location.replace(
              `/clientportal/login?next=${encodeURIComponent(window.location.pathname)}`,
            );
        } else setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [login]);
  if (error)
    return (
      <div className="portal-loading" role="alert">
        {error}{" "}
        <button
          className="secondary-button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  if (!ready)
    return (
      <div className="portal-loading" role="status">
        Checking your session...
      </div>
    );
  return children(user, setUser);
}

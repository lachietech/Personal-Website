import { apiFetch } from "./api/http.js";
const SESSION_KEY = "ni.analytics.session";

function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID().replaceAll("-", "");
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function trackPageView() {
  if (navigator.globalPrivacyControl || navigator.doNotTrack === "1") return;

  const send = async () => {
    try {
      const tokenResponse = await apiFetch("/csrf-token", {
        credentials: "include",
      });
      if (!tokenResponse.ok) return;
      const { csrfToken } = await tokenResponse.json();
      await apiFetch("/clientportal/api/analytics/event", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          path: location.pathname.slice(0, 300),
          title: document.title,
          referrer: document.referrer,
        }),
      });
    } catch {
      // Analytics must never interfere with the visitor experience.
    }
  };

  if (document.readyState === "complete") send();
  else window.addEventListener("load", send, { once: true });
}

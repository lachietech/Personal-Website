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
      const tokenResponse = await fetch("/csrf-token", {
        credentials: "same-origin",
      });
      if (!tokenResponse.ok) return;
      const { csrfToken } = await tokenResponse.json();
      await fetch("/clientportal/api/analytics/event", {
        method: "POST",
        credentials: "same-origin",
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

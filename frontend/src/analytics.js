import { apiUrl } from "./api/http.js";
import { createVisitPulse } from "./visitpulse-tracker.js";

const tracker = createVisitPulse({
  endpoint: import.meta.env.VITE_VISITPULSE_ENDPOINT || apiUrl("/clientportal/api/analytics/v1/events"),
  username: import.meta.env.VITE_VISITPULSE_USERNAME || "nielseninnovations",
});

export function trackPageView() {
  tracker.start();
}

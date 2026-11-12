import { PortalSession } from "../client-portal/components/PortalSession.jsx";
import { PortalLayout } from "../client-portal/components/PortalLayout.jsx";
import { AnalyticsPanel } from "../client-portal/components/AnalyticsPanel.jsx";
export function VisitPulseApp() {
  return (
    <PortalSession>
      {(user) => (
        <PortalLayout
          eyebrow="VisitPulse"
          title="Website analytics"
          subtitle="A clearer view of your audience."
        >
          {user.role === "admin" ? (
            <AnalyticsPanel />
          ) : (
            <section className="invoice-panel empty-state">
              <i className="bi bi-graph-up-arrow" aria-hidden="true" />
              <h2>Your insights start here</h2>
              <p>Website analytics are not available for this account yet.</p>
            </section>
          )}
        </PortalLayout>
      )}
    </PortalSession>
  );
}

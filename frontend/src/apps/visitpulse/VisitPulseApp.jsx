import { PortalSession } from "../client-portal/components/PortalSession.jsx";
import { PortalLayout } from "../client-portal/components/PortalLayout.jsx";
import { AnalyticsPanel } from "../client-portal/components/AnalyticsPanel.jsx";
export function VisitPulseApp() {
  return (
    <PortalSession>
      {() => (
        <PortalLayout
          eyebrow="VisitPulse"
          title="Website analytics"
          subtitle="A clearer view of your audience."
        >
          <AnalyticsPanel />
        </PortalLayout>
      )}
    </PortalSession>
  );
}

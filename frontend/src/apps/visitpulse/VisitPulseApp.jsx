import { useState } from "react";
import { ProductBrand } from "../../components/ProductBrand.jsx";
import { PortalSession } from "../client-portal/components/PortalSession.jsx";
import { PortalLayout } from "../client-portal/components/PortalLayout.jsx";
import { AnalyticsPanel } from "../client-portal/components/AnalyticsPanel.jsx";
export function VisitPulseApp() {
  const [days, setDays] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <PortalSession>
      {() => (
        <PortalLayout
          brand={
            <a
              className="product-brand-link"
              href="/clientportal/visitpulse"
              aria-label="VisitPulse Analytics"
            >
              <ProductBrand product="visitpulse" />
            </a>
          }
          eyebrow="VisitPulse"
          title="Website analytics"
          subtitle="A clearer view of your audience."
          className="visitpulse-main"
          headerActions={
            <div className="analytics-controls">
              <label htmlFor="analyticsPeriod">Reporting period</label>
              <div className="analytics-control-row">
                <select
                  id="analyticsPeriod"
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  title="Refresh analytics"
                  aria-label="Refresh analytics"
                  disabled={loading}
                >
                  <i
                    className={`bi bi-arrow-clockwise${loading ? " is-spinning" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          }
        >
          <AnalyticsPanel
            days={days}
            refreshKey={refreshKey}
            onLoadingChange={setLoading}
          />
        </PortalLayout>
      )}
    </PortalSession>
  );
}

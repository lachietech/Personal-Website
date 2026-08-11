import { useUniformData } from "../hooks/useUniformData.js";

function number(value) {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(
    Number(value || 0),
  );
}

function StatCard({ label, value, detail }) {
  return (
    <article className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {detail && <span className="stat-subtext">{detail}</span>}
    </article>
  );
}

export function DashboardPage() {
  const { data, loading, error, reload } = useUniformData("/api/dashboard");

  if (loading) return <p className="loading">Loading dashboard…</p>;
  if (error) return <p className="status-message error">{error}</p>;

  const totals = data?.totals || {};
  const progress = data?.projectionVsCurrentProgress || {};
  const comparison = data?.yearProjectionComparison || {};

  return (
    <section className="section active">
      <div className="section-header-row">
        <div>
          <h2>Sales Dashboard</h2>
          <p>Current performance and forward projections.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={reload}>
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Current month"
          value={number(totals.currentTotal)}
          detail={totals.currentMonth || "No data"}
        />
        <StatCard
          label="Same month last year"
          value={
            totals.yearOverYearTotal === null
              ? "N/A"
              : number(totals.yearOverYearTotal)
          }
          detail={totals.yearOverYearMonth || "Not enough history"}
        />
        <StatCard
          label="Next forecast"
          value={number(data?.forecast?.[0]?.projectedTotal)}
          detail={data?.forecast?.[0]?.month || "Unavailable"}
        />
        <StatCard
          label="Forecast average"
          value={number(data?.forecastSummary?.projectedAverageMonthly)}
          detail={`${data?.forecastSummary?.forecastHorizon || 0} months`}
        />
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-panel dashboard-panel-wide">
          <div className="panel-header">
            <h3>Projection progress</h3>
            <span>{progress.asOfMonth || "Latest month"}</span>
          </div>
          <div className="year-compare-grid">
            <StatCard
              label="Projected year"
              value={number(progress.projectedYearTotal)}
            />
            <StatCard
              label="Current position"
              value={number(progress.actualToDateTotal)}
            />
            <StatCard
              label="Remaining"
              value={number(progress.remainingToProjection)}
            />
            <StatCard
              label="Completion"
              value={
                progress.completionPercent === null
                  ? "N/A"
                  : `${number(progress.completionPercent)}%`
              }
            />
          </div>
          <div className="snapshot-dropdown-list">
            {(progress.categoryBreakdown || []).map((category) => (
              <details className="snapshot-dropdown" key={category.category}>
                <summary>
                  <strong>{category.category}</strong>
                  <span>{number(category.actualToDateTotal)} current</span>
                </summary>
                <div className="category-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Projected</th>
                        <th>Current</th>
                        <th>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(category.sizes || []).map((size) => (
                        <tr key={size.size}>
                          <td>{size.size}</td>
                          <td>{number(size.projectedYearTotal)}</td>
                          <td>{number(size.actualToDateTotal)}</td>
                          <td>{number(size.remainingToProjection)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        </article>

        <article className="dashboard-panel dashboard-panel-wide">
          <div className="panel-header">
            <h3>Calendar-year comparison</h3>
            <span>
              {comparison.currentYear} vs {comparison.previousYear}
            </span>
          </div>
          <div className="year-compare-grid">
            <StatCard
              label={`${comparison.currentYear} projection`}
              value={number(comparison.currentYearTotal)}
            />
            <StatCard
              label={`${comparison.previousYear} projection`}
              value={number(comparison.previousYearTotal)}
            />
            <StatCard label="Change" value={number(comparison.delta)} />
            <StatCard
              label="Change percent"
              value={
                comparison.deltaPercent === null
                  ? "N/A"
                  : `${number(comparison.deltaPercent)}%`
              }
            />
          </div>
        </article>
      </div>
    </section>
  );
}

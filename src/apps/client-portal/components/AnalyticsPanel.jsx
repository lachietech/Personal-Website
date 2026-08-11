import { useCallback, useEffect, useMemo, useState } from "react";
import { portalRequest } from "../api/portalApi.js";

function Metric({ label, value, detail }) {
  return (
    <article className="summary-panel">
      <span className="summary-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Ranking({ title, items, field }) {
  const maximum = Math.max(...items.map((item) => item.views), 1);
  return (
    <article className="analytics-card">
      <h3>{title}</h3>
      {items.length ? (
        <ol className="analytics-ranking">
          {items.map((item) => (
            <li key={item[field]}>
              <div>
                <span title={item[field]}>{item[field]}</span>
                <strong>{item.views.toLocaleString()}</strong>
              </div>
              <span className="analytics-bar">
                <span style={{ width: `${(item.views / maximum) * 100}%` }} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="analytics-empty">No visits in this period.</p>
      )}
    </article>
  );
}

export function AnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await portalRequest(`/clientportal/api/analytics/summary?days=${days}`),
      );
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const maximumDailyViews = useMemo(
    () => Math.max(...(data?.daily || []).map((item) => item.views), 1),
    [data],
  );

  return (
    <section className="analytics-panel">
      <div className="panel-heading analytics-heading">
        <div>
          <p className="eyebrow">First-party analytics</p>
          <h2>Website activity</h2>
          <p>Cookie-free traffic insights collected by your own application.</p>
        </div>
        <div className="analytics-controls">
          <label htmlFor="analyticsPeriod">Period</label>
          <select
            id="analyticsPeriod"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="icon-button" type="button" onClick={load} title="Refresh analytics">
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && <div className="notice warning">{error}</div>}
      {loading && !data ? (
        <div className="analytics-loading">Loading analytics…</div>
      ) : (
        data && (
          <>
            <div className="analytics-summary">
              <Metric label="Page views" value={data.totals.pageViews.toLocaleString()} detail={`Across ${days} days`} />
              <Metric label="Sessions" value={data.totals.visitors.toLocaleString()} detail="Unique browser sessions" />
              <Metric label="Views / session" value={data.totals.viewsPerVisitor} detail="Average engagement" />
            </div>

            <article className="analytics-card analytics-trend-card">
              <div className="analytics-card-heading">
                <h3>Daily traffic</h3>
                <span>Page views</span>
              </div>
              {data.daily.length ? (
                <div className="analytics-chart" aria-label="Daily page views chart">
                  {data.daily.map((item) => (
                    <div className="analytics-chart-column" key={item.date} title={`${item.date}: ${item.views} views`}>
                      <span>{item.views}</span>
                      <div style={{ height: `${Math.max((item.views / maximumDailyViews) * 100, 4)}%` }} />
                      <small>{item.date.slice(5)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analytics-empty">Traffic will appear here after the first visit.</p>
              )}
            </article>

            <div className="analytics-grid">
              <Ranking title="Top pages" items={data.pages} field="path" />
              <Ranking title="Top referrers" items={data.referrers} field="referrer" />
              <Ranking title="Devices" items={data.devices} field="device" />
              <Ranking title="Browsers" items={data.browsers} field="browser" />
            </div>

            <article className="analytics-card">
              <h3>Recent activity</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Page</th><th>Source</th><th>Device</th><th>Time</th></tr></thead>
                  <tbody>
                    {data.recent.map((event) => (
                      <tr key={`${event.occurredAt}-${event.path}`}>
                        <td><strong>{event.title || event.path}</strong><small className="analytics-path">{event.path}</small></td>
                        <td>{event.referrer}</td>
                        <td>{event.device} · {event.browser}</td>
                        <td>{new Date(event.occurredAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )
      )}
    </section>
  );
}

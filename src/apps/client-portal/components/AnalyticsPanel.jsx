import { useCallback, useEffect, useMemo, useState } from "react";
import { portalRequest } from "../api/portalApi.js";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function Metric({ icon, label, value, detail }) {
  return (
    <article className="summary-panel analytics-metric">
      <div className="analytics-metric-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </div>
      <div>
        <span className="summary-label">{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function Ranking({ title, items, field }) {
  const maximum = Math.max(...items.map((item) => item.views), 1);

  return (
    <article className="analytics-card">
      <div className="analytics-card-heading">
        <h3>{title}</h3>
        <span>Views</span>
      </div>
      {items.length ? (
        <ol className="analytics-ranking">
          {items.map((item) => (
            <li key={item[field]}>
              <div>
                <span title={item[field]}>{item[field]}</span>
                <strong>{item.views.toLocaleString()}</strong>
              </div>
              <span className="analytics-bar" aria-hidden="true">
                <span style={{ width: `${(item.views / maximum) * 100}%` }} />
              </span>
              <small>{item.visitors.toLocaleString()} sessions</small>
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
      const summary = await portalRequest(
        `/clientportal/api/analytics/summary?days=${days}`,
      );
      setData(summary);
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
    <section className="analytics-panel" aria-busy={loading}>
      <div className="panel-heading analytics-heading">
        <div>
          <p className="eyebrow">First-party analytics</p>
          <h2>Website activity</h2>
          <p className="analytics-intro">
            Privacy-friendly traffic insights collected by your application.
          </p>
          {data?.storage?.connected && (
            <small className="analytics-storage-status">
              <span aria-hidden="true" /> Live data · {data.storage.collection}
            </small>
          )}
        </div>
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
              onClick={load}
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
      </div>

      {error && (
        <div className="notice warning analytics-notice" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>{error}</span>
          <button className="text-button" type="button" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="analytics-loading" role="status">
          <span className="loading-ring" aria-hidden="true" />
          Loading analytics…
        </div>
      ) : (
        data && (
          <>
            <div className="analytics-summary">
              <Metric
                icon="bi-eye"
                label="Page views"
                value={data.totals.pageViews.toLocaleString()}
                detail={`Across ${data.days} days`}
              />
              <Metric
                icon="bi-people"
                label="Sessions"
                value={data.totals.visitors.toLocaleString()}
                detail="Unique browser sessions"
              />
              <Metric
                icon="bi-activity"
                label="Views / session"
                value={data.totals.viewsPerVisitor}
                detail="Average engagement"
              />
            </div>

            <article className="analytics-card analytics-trend-card">
              <div className="analytics-card-heading">
                <div>
                  <p className="eyebrow">Trend</p>
                  <h3>Daily traffic</h3>
                </div>
                <span>Page views</span>
              </div>
              {data.daily.length ? (
                <div
                  className="analytics-chart"
                  role="img"
                  aria-label="Daily page views chart"
                >
                  {data.daily.map((item) => (
                    <div
                      className="analytics-chart-column"
                      key={item.date}
                      title={`${item.date}: ${item.views} views`}
                    >
                      <span>{item.views}</span>
                      <div
                        style={{
                          height: `${Math.max(
                            (item.views / maximumDailyViews) * 100,
                            4,
                          )}%`,
                        }}
                      />
                      <small>{item.date.slice(5)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analytics-empty">
                  Traffic will appear here after the first visit.
                </p>
              )}
            </article>

            <div className="analytics-grid">
              <Ranking title="Top pages" items={data.pages} field="path" />
              <Ranking
                title="Top referrers"
                items={data.referrers}
                field="referrer"
              />
              <Ranking title="Devices" items={data.devices} field="device" />
              <Ranking
                title="Browsers"
                items={data.browsers}
                field="browser"
              />
            </div>

            <article className="analytics-card analytics-activity-card">
              <div className="analytics-card-heading">
                <h3>Recent activity</h3>
                <span>Latest 20 events</span>
              </div>
              {data.recent.length ? (
                <div className="table-wrap">
                  <table className="data-table analytics-table">
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Source</th>
                        <th>Device</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((event, index) => (
                        <tr key={`${event.occurredAt}-${event.path}-${index}`}>
                          <td data-label="Page">
                            <strong>{event.title || event.path}</strong>
                            <small className="analytics-path">{event.path}</small>
                          </td>
                          <td data-label="Source">{event.referrer}</td>
                          <td data-label="Device">
                            {event.device} · {event.browser}
                          </td>
                          <td data-label="Time">
                            {dateTimeFormatter.format(new Date(event.occurredAt))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="analytics-empty">No recent activity to show.</p>
              )}
            </article>
          </>
        )
      )}
    </section>
  );
}

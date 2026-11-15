import { useCallback, useEffect, useState } from "react";
import { portalRequest } from "../api/portalApi.js";

const chartColors = [
  "#60a5fa",
  "#2dd4bf",
  "#c084fc",
  "#fbbf24",
  "#fb7185",
  "#a3e635",
  "#f97316",
  "#818cf8",
];

function TrafficChart({ items }) {
  const maximum = Math.max(...items.map((item) => item.views), 1);
  const points = items.map((item, index) => ({
    ...item,
    x: items.length === 1 ? 500 : 8 + (index / (items.length - 1)) * 984,
    y: 12 + (1 - item.views / maximum) * 196,
  }));
  const labelIndices = [
    ...new Set([0, Math.floor((items.length - 1) / 2), items.length - 1]),
  ];

  return (
    <div className="analytics-line-chart">
      <div className="analytics-line-scale" aria-hidden="true">
        <span>{maximum.toLocaleString()}</span>
        <span>0</span>
      </div>
      <div className="analytics-line-plot">
        <svg
          viewBox="0 0 1000 220"
          preserveAspectRatio="none"
          role="img"
          aria-label="Daily page views"
        >
          <title>Daily traffic: page views by date</title>
          {[12, 110, 208].map((y) => (
            <line
              key={y}
              x1="0"
              x2="1000"
              y1={y}
              y2={y}
              className="analytics-gridline"
            />
          ))}
          <polyline
            points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
            className="analytics-traffic-line"
          />
          {points.map((point) => (
            <circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r="4"
              className="analytics-traffic-point"
              tabIndex={0}
              aria-label={`${point.date}: ${point.views.toLocaleString()} views`}
            >
              <title>
                {point.date}: {point.views.toLocaleString()} views
              </title>
            </circle>
          ))}
        </svg>
        <div className="analytics-line-dates" aria-hidden="true">
          {labelIndices.map((index) => (
            <span key={index}>{items[index].date.slice(5)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PieChart({ title, items, field }) {
  const total = items.reduce((sum, item) => sum + item.views, 0);
  let cumulative = 0;
  const slices = items.map((item, index) => {
    const start = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += item.views;
    const end = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    return {
      ...item,
      color: chartColors[index % chartColors.length],
      path: `M 100 100 L ${100 + 96 * Math.cos(start)} ${100 + 96 * Math.sin(start)} A 96 96 0 ${end - start > Math.PI ? 1 : 0} 1 ${100 + 96 * Math.cos(end)} ${100 + 96 * Math.sin(end)} Z`,
    };
  });

  return (
    <article className="analytics-card">
      <div className="analytics-card-heading">
        <h3>{title}</h3>
        <span>Page views</span>
      </div>
      {total > 0 ? (
        <div className="analytics-pie-layout">
          <svg
            className="analytics-pie"
            viewBox="0 0 200 200"
            role="img"
            aria-label={`${title} share of page views`}
          >
            <title>{title} share of page views</title>
            {slices
              .filter((item) => item.views > 0)
              .map((item) =>
                item.views === total ? (
                  <circle
                    key={item[field]}
                    cx="100"
                    cy="100"
                    r="96"
                    fill={item.color}
                  >
                    <title>
                      {item[field]}: {item.views.toLocaleString()} views (100%)
                    </title>
                  </circle>
                ) : (
                  <path key={item[field]} d={item.path} fill={item.color}>
                    <title>
                      {item[field]}: {item.views.toLocaleString()} views (
                      {((item.views / total) * 100).toFixed(1)}%)
                    </title>
                  </path>
                ),
              )}
          </svg>
          <ul className="analytics-pie-legend">
            {slices.map((item) => (
              <li key={item[field]}>
                <span
                  className="analytics-pie-key"
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                <span className="analytics-pie-label">{item[field]}</span>
                <strong>
                  {item.views.toLocaleString()}{" "}
                  <small>({((item.views / total) * 100).toFixed(1)}%)</small>
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="analytics-empty">No visits in this period.</p>
      )}
    </article>
  );
}

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

function Ranking({ title, items, field, compact = false }) {
  const maximum = Math.max(...items.map((item) => item.views), 1);

  return (
    <article className="analytics-card">
      <div className="analytics-card-heading">
        <h3>{title}</h3>
        <span>Views</span>
      </div>
      {items.length ? (
        <ol
          className={`analytics-ranking${compact ? " analytics-ranking-compact" : ""}`}
        >
          {items.map((item) => (
            <li key={item[field]}>
              <div>
                <span title={item[field]}>{item[field]}</span>
                <strong>{item.views.toLocaleString()}</strong>
              </div>
              {!compact && (
                <span className="analytics-bar" aria-hidden="true">
                  <span style={{ width: `${(item.views / maximum) * 100}%` }} />
                </span>
              )}
              {!compact && (
                <small>{item.visitors.toLocaleString()} sessions</small>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="analytics-empty">No visits in this period.</p>
      )}
    </article>
  );
}

export function AnalyticsPanel({ days = 30, refreshKey = 0, onLoadingChange }) {
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
  }, [load, refreshKey]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  return (
    <section className="analytics-panel" aria-busy={loading}>
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
                <TrafficChart items={data.daily} />
              ) : (
                <p className="analytics-empty">
                  Traffic will appear here after the first visit.
                </p>
              )}
            </article>

            <div className="analytics-grid">
              <Ranking
                title="Top pages"
                items={data.pages}
                field="path"
                compact
              />
              <PieChart
                title="Top referrers"
                items={data.referrers}
                field="referrer"
              />
              <PieChart title="Devices" items={data.devices} field="device" />
              <PieChart
                title="Browsers"
                items={data.browsers}
                field="browser"
              />
            </div>
          </>
        )
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { meanderRequest } from "../api/meanderApi.js";

const metrics = [
  ["Temperature", "temp", "°C"],
  ["Humidity", "humidity", "%"],
  ["Cloud cover", "cloud", "%"],
  ["UV index", "uv", ""],
  ["Wind", "wind", " km/h"],
  ["Rain", "precip", " mm"],
];

export function SuitePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await meanderRequest("/api/suite-data"));
    } catch (requestError) {
      if (/sign in/i.test(requestError.message))
        window.location.assign("/meandersuite/login");
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <main className="suite-page">
      <div className="suite-toolbar">
        <img
          className="meander-logo"
          src="/static/meandersuiteprerelease/mainfiles/logowhite.png"
          alt="Meander Suite"
        />
        <button
          className="meander-button secondary"
          type="button"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && <p className="meander-status">{error}</p>}
      {data && (
        <>
          <section className="weather-grid">
            {metrics.map(([label, key, suffix]) => (
              <article className="meander-card weather-card" key={key}>
                <span>{label}</span>
                <p className="weather-value">
                  {data[key]}
                  {suffix}
                </p>
              </article>
            ))}
          </section>
          <section className="meander-card cwis-card">
            <p>Climatic Weather Impact Score</p>
            <p className="cwis-score">{Math.round(data.score)}</p>
            <h1>{data.Tier}</h1>
            <h2>{data.Mood}</h2>
            <p>{data.Behaviour}</p>
            <p>{data.Notes}</p>
          </section>
        </>
      )}
    </main>
  );
}

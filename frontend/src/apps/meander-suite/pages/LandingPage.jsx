import { MeanderNav } from "../components/MeanderNav.jsx";

export function LandingPage() {
  return (
    <div className="meander-shell">
      <MeanderNav />
      <main>
        <section className="meander-hero">
          <div className="meander-hero-content">
            <h1>Predict. Prepare. Prevent.</h1>
            <p>
              Insight-driven behaviour forecasting powered by weather science,
              designed to give educators a clearer view of the day ahead.
            </p>
            <div className="meander-actions">
              <a className="meander-button" href="/meandersuite/register">
                Get started
              </a>
              <a className="meander-button secondary" href="#about">
                Learn more
              </a>
            </div>
          </div>
        </section>
        <section className="meander-section" id="about">
          <h2>About Meander Suite</h2>
          <p>
            Meander Suite applies the Climatic Weather Impact Score (CWIS) to
            help schools understand how environmental conditions may influence
            children&apos;s behaviour. It turns live weather data into
            practical, easy-to-read guidance for teaching teams.
          </p>
          <div className="meander-feature-grid">
            <article className="meander-card">
              <h3>CWIS model</h3>
              <p>
                A research-led score summarises current atmospheric factors and
                their likely impact.
              </p>
            </article>
            <article className="meander-card">
              <h3>Live conditions</h3>
              <p>
                Temperature, humidity, cloud, UV, wind, and rain appear in one
                clear dashboard.
              </p>
            </article>
            <article className="meander-card">
              <h3>Practical guidance</h3>
              <p>
                Tier, mood, behaviour, and notes help teams prepare appropriate
                classroom support.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

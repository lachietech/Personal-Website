import { hostingPlans } from "../../content/siteContent.js";
import { Icon } from "../Icon.jsx";

function BuildCard() {
  return (
    <article className="price-card price-card-build fade-up">
      <div className="price-card-head">
        <span className="price-icon">
          <Icon name="bi-window-sidebar" />
        </span>
        <span className="price-label">Build</span>
      </div>
      <h3>Website creation</h3>
      <p className="price-intro">
        A tailored site or application, designed and developed around your
        goals.
      </p>
      <ul className="price-list">
        <li>
          <span>Basic site</span>
          <strong>$200 + hours</strong>
        </li>
        <li>
          <span>Standard site</span>
          <strong>$500 + hours</strong>
        </li>
        <li>
          <span>Complex site</span>
          <strong>$1,000 + hours</strong>
        </li>
      </ul>
      <a href="#contact" className="btn btn-dark-custom">
        Get a project quote <Icon name="bi-arrow-right" />
      </a>
    </article>
  );
}

function HostingCard({ plan }) {
  return (
    <article
      className={`price-card fade-up${plan.popular ? " price-card-popular" : ""}`}
    >
      {plan.popular && <span className="popular-badge">Most popular</span>}
      <div className="price-card-head">
        <span className="price-icon">
          <Icon name={plan.icon} />
        </span>
        <span className="price-label">{plan.label}</span>
      </div>
      <h3>{plan.title}</h3>
      <div className="price">
        <strong>{plan.price}</strong>
        <span>/ month</span>
      </div>
      <ul className="feature-list">
        {plan.features.map((feature) => (
          <li key={feature}>
            <Icon name="bi-check2" /> {feature}
          </li>
        ))}
      </ul>
      <a href="#contact" className="text-link">
        Enquire <Icon name="bi-arrow-right" />
      </a>
    </article>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="section pricing-section">
      <div className="container">
        <div className="pricing-header fade-up">
          <p className="eyebrow">Simple starting points</p>
          <h2 className="section-heading">Pricing with room to fit.</h2>
          <p>
            Every project is different. These prices are a guide; get in touch
            for a free quote based on what your idea needs.
          </p>
        </div>

        <div className="pricing-grid">
          <BuildCard />
          {hostingPlans.map((plan) => (
            <HostingCard plan={plan} key={plan.title} />
          ))}
        </div>
        <p className="pricing-disclaimer fade-up">
          Hosting inclusions and limits are confirmed in your quote and may vary
          with usage requirements.
        </p>
      </div>
    </section>
  );
}

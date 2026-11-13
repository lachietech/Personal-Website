import { hostingPlans } from "../content/siteContent.js";
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
      <p className="build-quote">Your idea. A tailored quote.</p>
      <p className="price-intro">
        Tell me what you want to build and I’ll put together a free quote
        for your project. VisitPulse Analytics and Konnect Mailbox access
        come included.
      </p>
      <a href="#contact" className="btn btn-dark-custom">
        Get a project quote <Icon name="bi-arrow-right" />
      </a>
    </article>
  );
}

function HostingCard({ plan }) {
  return (
    <article className="price-card fade-up">
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
        <div className="section-intro fade-up">
          <div>
            <p className="eyebrow">Build & host</p>
            <h2 className="section-heading">Your project. The right plan.</h2>
          </div>
          <p>
            Website creation starts with a conversation and a tailored quote.
            Choose from two monthly hosting packages to keep your site running.
          </p>
        </div>

        <div className="pricing-grid">
          <BuildCard />
          {hostingPlans.map((plan) => (
            <HostingCard plan={plan} key={plan.title} />
          ))}
        </div>
        <p className="pricing-disclaimer fade-up">
          Server-backed hosting starts at $60 per month. The final cost depends
          on your application and hosting requirements, confirmed in your quote.
        </p>
      </div>
    </section>
  );
}

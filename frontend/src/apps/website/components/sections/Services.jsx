import { services } from "../content/siteContent.js";
import { Icon } from "../Icon.jsx";

function ServiceCard({ service, index }) {
  const className = `service-card fade-up${
    index === 0 ? " service-card-featured" : ""
  }`;

  return (
    <article className={className}>
      <div className="service-topline">
        <span className="service-number">0{index + 1}</span>
        <Icon name={service.icon} />
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <div className="tag-list">
        {service.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  );
}

export function Services() {
  return (
    <div className="services-grid">
      {services.map((service, index) => (
        <ServiceCard service={service} index={index} key={service.title} />
      ))}
    </div>
  );
}

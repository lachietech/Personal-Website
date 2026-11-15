import { Icon } from "../Icon.jsx";
import { ProductBrand } from "../../../../components/ProductBrand.jsx";

const products = [
  {
    id: "visitpulse",
    name: "VisitPulse Analytics",
    tagline: "Understand what happens after launch.",
    description:
      "Every product built with Nielsen Innovations will include access to VisitPulse Analytics when it launches. Get a clearer view of how people find and use your website, so your next decision starts with insight.",
    benefits: [
      "Follow page views, sessions and traffic over time.",
      "Discover your most visited pages and referral sources.",
      "Understand the devices and browsers your audience uses.",
    ],
  },
  {
    id: "konnect",
    name: "Konnect Mailbox",
    tagline: "Give every enquiry a place to land.",
    description:
      "Every product built with Nielsen Innovations will also include access to Konnect Mailbox when it launches. Bring incoming website enquiries into one organised inbox, ready to read and keep track of through your client portal.",
    benefits: [
      "Receive messages from your website’s contact form.",
      "Star important enquiries and mark messages unread.",
      "Search your mailbox and archive messages when you’re done.",
    ],
  },
];

function AnalyticsVisual() {
  return (
    <div className="product-visual" aria-hidden="true">
      <div className="product-visual-heading">
        <ProductBrand product="visitpulse" />
      </div>
      <div className="product-chart">
        <svg viewBox="0 0 440 180" fill="none">
          <path
            d="M0 145 C35 145 40 102 75 112 S125 145 160 92 S200 125 240 68 S295 100 330 48 S390 60 440 15 V180 H0Z"
            fill="currentColor"
            opacity="0.1"
          />
          <path
            d="M0 145 C35 145 40 102 75 112 S125 145 160 92 S200 125 240 68 S295 100 330 48 S390 60 440 15"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      </div>
      <div className="product-insights">
        <span>
          <Icon name="bi-eye" /> Page views
        </span>
        <span>
          <Icon name="bi-people" /> Sessions
        </span>
        <span>
          <Icon name="bi-signpost-split" /> Referrals
        </span>
      </div>
      <p className="product-visual-caption">
        Turn website activity into useful insight.
      </p>
    </div>
  );
}

function MailboxVisual() {
  return (
    <div className="product-visual product-visual-mail" aria-hidden="true">
      <div className="product-visual-heading">
        <ProductBrand product="konnect" />
      </div>
      <div className="product-message">
        <Icon name="bi-envelope-paper" />
        <div>
          <strong>Website enquiries</strong>
          <span>From your contact form to your mailbox.</span>
        </div>
        <Icon name="bi-star" />
      </div>
      <div className="product-mail-tools">
        <span>
          <Icon name="bi-search" /> Find it
        </span>
        <span>
          <Icon name="bi-star" /> Star it
        </span>
        <span>
          <Icon name="bi-archive" /> File it
        </span>
      </div>
      <p className="product-visual-caption">
        A little less inbox clutter. A little more clarity.
      </p>
    </div>
  );
}

export function IncludedProducts() {
  return products.map((product) => (
    <section
      key={product.id}
      id={product.id}
      className={`section included-product${product.id === "konnect" ? " included-product-reversed" : ""}`}
      aria-labelledby={`${product.id}-heading`}
    >
      <div className="container included-product-layout">
        <div className="included-product-copy fade-up">
          <div className="product-heading-meta">
            <p className="eyebrow">Included with every product</p>
            <span className="coming-soon-badge">
              <Icon name="bi-clock" /> Coming soon
            </span>
          </div>
          <h2 id={`${product.id}-heading`} className="section-heading">
            {product.name}
          </h2>
          <p className="product-tagline">{product.tagline}</p>
          <p className="product-description">{product.description}</p>
          <ul className="product-benefits">
            {product.benefits.map((benefit) => (
              <li key={benefit}>
                <Icon name="bi-check2" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <a href="#contact" className="text-link">
            Discuss your project <Icon name="bi-arrow-up-right" />
          </a>
        </div>
        <div className="included-product-art fade-up">
          {product.id === "visitpulse" ? (
            <AnalyticsVisual />
          ) : (
            <MailboxVisual />
          )}
        </div>
      </div>
    </section>
  ));
}

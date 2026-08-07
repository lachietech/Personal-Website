import { Icon } from "../Icon.jsx";

export function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-orb hero-orb-one" />
      <div className="hero-orb hero-orb-two" />

      <div className="container hero-container">
        <div className="row align-items-center g-5">
          <div className="col-lg-7">
            <div className="hero-copy">
              <p className="eyebrow hero-eyebrow">
                <span className="status-dot" />
                Brisbane-based digital studio
              </p>
              <h1>
                Ideas engineered into{" "}
                <span className="text-accent">real digital products.</span>
              </h1>
              <p className="hero-lead">
                I design and build modern websites, applications, and digital
                systems that turn ambitious ideas into useful, human-centred
                experiences.
              </p>
              <div className="hero-actions">
                <a href="#portfolio" className="btn btn-primary-custom">
                  Explore my work <Icon name="bi-arrow-down-right" />
                </a>
                <a href="#contact" className="btn btn-ghost-custom">
                  Start a conversation
                </a>
              </div>
              <div className="hero-meta">
                <span>
                  <Icon name="bi-code-square" /> Full-stack
                </span>
                <span>
                  <Icon name="bi-bezier2" /> Product design
                </span>
                <span>
                  <Icon name="bi-stars" /> AI exploration
                </span>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="hero-visual">
              <div className="visual-grid" />
              <div className="portrait-frame">
                <img
                  src="/static/main/img/me2.jpg"
                  alt="Lachlan Nielsen, founder of Nielsen Innovations"
                />
              </div>
              <div className="floating-card card-role">
                <span className="card-icon">
                  <Icon name="bi-braces" />
                </span>
                <span>
                  <small>Currently building</small>
                  <strong>Useful things for real people</strong>
                </span>
              </div>
              <div className="floating-card card-location">
                <span className="pulse-ring" />
                <span>
                  <small>Based in</small>
                  <strong>Brisbane, Australia</strong>
                </span>
              </div>
              <span className="visual-caption">
                Lachlan Nielsen · Founder & developer
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const services = [
  ["bi-code-slash", "Full-stack development", "Responsive websites and custom applications, from polished front ends to dependable backend systems.", ["JavaScript", "Node.js", "Python"]],
  ["bi-bezier2", "Product & interface design", "Clear information architecture and intuitive interfaces that make complex workflows feel simple.", ["UI/UX", "Prototyping", "Accessibility"]],
  ["bi-cpu", "AI exploration", "Thoughtful AI integration and research grounded in genuine product value.", ["Integration", "Research", "Responsible AI"]],
  ["bi-cloud-check", "Hosting & ongoing support", "Managed hosting, maintenance, technical support, and practical improvements after launch.", ["Hosting", "Maintenance", "Support"]]
];

const plans = [
  ["bi-box", "Hosting 01", "Basic assisted", "$40", ["Technical support", "Maintenance", "Email forms", "Database & web hosting"]],
  ["bi-layers", "Hosting 02", "Standard assisted", "$90", ["Technical support", "Audits & maintenance", "Database hosting", "Email server & web hosting"]],
  ["bi-stack", "Hosting 03", "Advanced assisted", "$120", ["Technical support", "Audits & maintenance", "Database & email server", "Increased usage limits"]]
];

function useSiteEffects() {
  useEffect(() => {
    const navbar = document.querySelector(".navbar");
    const onScroll = () => navbar?.classList.toggle("scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const items = [...document.querySelectorAll(".fade-up")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.IntersectionObserver) {
      items.forEach((item) => item.classList.add("visible"));
      return () => window.removeEventListener("scroll", onScroll);
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.1, rootMargin: "0px 0px -40px" });
    items.forEach((item) => observer.observe(item));
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);
}

function Navigation() {
  const [open, setOpen] = useState(false);
  return <nav className="navbar navbar-expand-lg navbar-dark fixed-top" aria-label="Primary navigation">
    <div className="container">
      <a className="navbar-brand" href="#home"><span className="brand-mark">N</span><span className="brand-name">Nielsen <strong>Innovations</strong></span></a>
      <button className="navbar-toggler" type="button" aria-expanded={open} aria-label="Toggle navigation" onClick={() => setOpen(!open)}><span className="navbar-toggler-icon" /></button>
      <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
        <ul className="navbar-nav ms-auto align-items-lg-center">
          {["Home", "About", "Services", "Pricing", "Work"].map((label) => <li className="nav-item" key={label}><a className="nav-link" href={`#${label === "Work" ? "portfolio" : label.toLowerCase()}`} onClick={() => setOpen(false)}>{label}</a></li>)}
          <li className="nav-item nav-portal"><a className="nav-link" href="/clientportal">Client portal <i className="bi bi-arrow-up-right" /></a></li>
        </ul>
      </div>
    </div>
  </nav>;
}

function Hero() {
  return <section id="home" className="hero"><div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
    <div className="container hero-container"><div className="row align-items-center g-5">
      <div className="col-lg-7"><div className="hero-copy"><p className="eyebrow hero-eyebrow"><span className="status-dot" />Brisbane-based digital studio</p>
        <h1>Ideas engineered into <span className="text-accent">real digital products.</span></h1>
        <p className="hero-lead">I design and build modern websites, applications, and digital systems that turn ambitious ideas into useful, human-centred experiences.</p>
        <div className="hero-actions"><a href="#portfolio" className="btn btn-primary-custom">Explore my work <i className="bi bi-arrow-down-right" /></a><a href="#contact" className="btn btn-ghost-custom">Start a conversation</a></div>
        <div className="hero-meta"><span><i className="bi bi-code-square" /> Full-stack</span><span><i className="bi bi-bezier2" /> Product design</span><span><i className="bi bi-stars" /> AI exploration</span></div>
      </div></div>
      <div className="col-lg-5"><div className="hero-visual"><div className="visual-grid" /><div className="portrait-frame"><img src="/static/main/img/me2.jpg" alt="Lachlan Nielsen, founder of Nielsen Innovations" /></div>
        <div className="floating-card card-role"><span className="card-icon"><i className="bi bi-braces" /></span><span><small>Currently building</small><strong>Useful things for real people</strong></span></div>
        <div className="floating-card card-location"><span className="pulse-ring" /><span><small>Based in</small><strong>Brisbane, Australia</strong></span></div><span className="visual-caption">Lachlan Nielsen · Founder & developer</span>
      </div></div>
    </div></div>
  </section>;
}

function About() {
  const values = [["Think broadly", "Explore the real problem before reaching for a solution."], ["Build thoughtfully", "Create clear, maintainable experiences with purpose."], ["Keep improving", "Learn from feedback and evolve the product over time."]];
  return <section id="about" className="section section-light"><div className="container"><div className="row g-5 align-items-start">
    <div className="col-lg-5 fade-up"><p className="eyebrow">A little about me</p><h2 className="section-heading">Built from curiosity. Driven by purpose.</h2></div>
    <div className="col-lg-7 fade-up"><div className="about-copy"><p className="about-lead">Hi, I’m Lachlan — a full-stack developer and the person behind Nielsen Innovations.</p><p>I turn early ideas into practical digital products, combining technical problem-solving with a strong focus on the people who use them.</p><p>I’m studying Information Technology at QUT, majoring in Artificial Intelligence and Software Development, while building products and client systems.</p></div>
      <div className="about-details">{values.map(([title, copy], index) => <div className="detail-item" key={title}><span className="detail-number">0{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div>
    </div></div></div></section>;
}

function Services() {
  return <section id="services" className="section services-section"><div className="container"><div className="section-intro fade-up"><div><p className="eyebrow">What I do</p><h2 className="section-heading">One partner, from idea to launch.</h2></div><p>Flexible support for organisations, teams, and founders who need a capable builder with a product mindset.</p></div>
    <div className="services-grid">{services.map(([icon, title, copy, tags], index) => <article className={`service-card fade-up ${index === 0 ? "service-card-featured" : ""}`} key={title}><div className="service-topline"><span className="service-number">0{index + 1}</span><i className={`bi ${icon}`} /></div><h3>{title}</h3><p>{copy}</p><div className="tag-list">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div>
  </div></section>;
}

function Pricing() {
  return <section id="pricing" className="section pricing-section"><div className="container"><div className="pricing-header fade-up"><p className="eyebrow">Simple starting points</p><h2 className="section-heading">Pricing with room to fit.</h2><p>Every project is different. These prices are a guide; get in touch for a free quote based on what your idea needs.</p></div>
    <div className="pricing-grid"><article className="price-card price-card-build fade-up"><div className="price-card-head"><span className="price-icon"><i className="bi bi-window-sidebar" /></span><span className="price-label">Build</span></div><h3>Website creation</h3><p className="price-intro">A tailored site or application, designed and developed around your goals.</p><ul className="price-list"><li><span>Basic site</span><strong>$200 + hours</strong></li><li><span>Standard site</span><strong>$500 + hours</strong></li><li><span>Complex site</span><strong>$1,000 + hours</strong></li></ul><a href="#contact" className="btn btn-dark-custom">Get a project quote <i className="bi bi-arrow-right" /></a></article>
      {plans.map(([icon, label, title, price, features], index) => <article className={`price-card fade-up ${index === 1 ? "price-card-popular" : ""}`} key={title}>{index === 1 && <span className="popular-badge">Most popular</span>}<div className="price-card-head"><span className="price-icon"><i className={`bi ${icon}`} /></span><span className="price-label">{label}</span></div><h3>{title}</h3><div className="price"><strong>{price}</strong><span>/ month</span></div><ul className="feature-list">{features.map((feature) => <li key={feature}><i className="bi bi-check2" /> {feature}</li>)}</ul><a href="#contact" className="text-link">Enquire <i className="bi bi-arrow-right" /></a></article>)}
    </div><p className="pricing-disclaimer fade-up">Hosting inclusions and limits are confirmed in your quote and may vary with usage requirements.</p>
  </div></section>;
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const response = await fetch("/clientportal/api/projects", { credentials: "same-origin", cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setProjects(data.projects || []); setError(""); }
    catch { setError("Projects are temporarily unavailable."); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    const refreshTimer = window.setInterval(load, 30000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(refreshTimer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);
  return <section id="portfolio" className="section portfolio-section"><div className="container"><div className="section-intro portfolio-intro fade-up"><div><p className="eyebrow">Selected work</p><h2 className="section-heading">Projects made to be used.</h2></div><a href="https://github.com/lachietech" className="text-link" target="_blank" rel="noreferrer">View GitHub <i className="bi bi-arrow-up-right" /></a></div>
    {loading && <div className="projects-status">Loading projects…</div>}{error && <div className="projects-status">{error}</div>}
    {!loading && !error && <div className="project-grid">{projects.map((project, index) => { const external = /^https?:\/\//.test(project.url); return <a key={project.id} href={project.url || "#contact"} className={`project-card project-card-text fade-up visible ${project.featured ? "project-card-wide" : ""}`} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <div className="project-card-top"><span className="project-index">{String(index + 1).padStart(2, "0")}</span><span className="project-type">{project.type} · {project.status}</span></div>
      <div className="project-card-body"><h3>{project.title}</h3><p>{project.summary || "Explore this Nielsen Innovations project."}</p></div>
      <div className="project-card-footer">{project.github?.language && <span><i className="bi bi-code-slash" /> {project.github.language}</span>}<span className="project-arrow"><i className="bi bi-arrow-up-right" /></span></div>
    </a>; })}</div>}
  </div></section>;
}

function Contact() {
  const [sending, setSending] = useState(false); const [notice, setNotice] = useState(null);
  async function submit(event) { event.preventDefault(); setSending(true); setNotice(null); const form = event.currentTarget;
    try { const tokenResponse = await fetch("/csrf-token", { credentials: "same-origin" }); const { csrfToken } = await tokenResponse.json(); const body = Object.fromEntries(new FormData(form)); const response = await fetch("/contact", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setNotice({ type: "success", text: data.message }); form.reset(); }
    catch (error) { setNotice({ type: "danger", text: error.message || "Unable to send your message." }); } finally { setSending(false); }
  }
  return <section id="contact" className="section contact-section"><div className="contact-orb" /><div className="container"><div className="row g-5"><div className="col-lg-5 fade-up"><div className="contact-copy"><p className="eyebrow">Let’s work together</p><h2 className="section-heading">Have an idea worth building?</h2><p>Tell me what you’re thinking. Whether it’s a clear brief or a rough concept, we can work out the next step together.</p><div className="contact-meta"><div><i className="bi bi-geo-alt" /><span><small>Location</small>Brisbane, Australia</span></div><div><i className="bi bi-clock" /><span><small>Typical response</small>Within 24–48 hours</span></div></div></div></div>
    <div className="col-lg-7 fade-up"><div className="contact-form">{notice && <div className={`alert alert-${notice.type}`}>{notice.text}</div>}<form onSubmit={submit}><div className="form-row"><div className="form-field"><label htmlFor="name">Your name</label><input className="form-control" id="name" name="name" required /></div><div className="form-field"><label htmlFor="email">Email address</label><input type="email" className="form-control" id="email" name="email" required /></div></div><div className="form-field"><label htmlFor="subject">What can I help with?</label><input className="form-control" id="subject" name="subject" required /></div><div className="form-field"><label htmlFor="message">Tell me about the project</label><textarea className="form-control" id="message" name="message" required /></div><button disabled={sending} className="btn btn-send">{sending ? "Sending…" : <>Send enquiry <i className="bi bi-arrow-up-right" /></>}</button></form></div></div></div></div></section>;
}

function App() {
  useSiteEffects();
  return <><a className="skip-link" href="#main-content">Skip to content</a><Navigation /><main id="main-content"><Hero /><About /><Services /><Pricing /><Projects /><Contact /></main><footer className="footer"><div className="container"><a className="footer-brand" href="#home"><span className="brand-mark">N</span><span>Nielsen Innovations</span></a><p>© {new Date().getFullYear()} Nielsen Innovations. Built in Brisbane with curiosity and care.</p><a href="#home" className="back-to-top">Back to top <i className="bi bi-arrow-up" /></a></div></footer></>;
}

createRoot(document.getElementById("root")).render(<App />);

import { PortalBrand } from "./PortalBrand.jsx";
import { AppTopbar } from "../../../components/AppTopbar.jsx";

export function PortalLayout({
  title,
  eyebrow,
  subtitle,
  actions,
  headerActions,
  brand,
  children,
  className = "",
}) {
  return (
    <div className="portal-app">
      <a className="skip-link" href="#portal-content">
        Skip to content
      </a>
      <AppTopbar
        brand={brand || <PortalBrand />}
        label="Client portal navigation"
      >
        <a className="home-link" href="/clientportal">
          <i className="bi bi-grid" aria-hidden="true" /> Applications
        </a>
        {actions}
      </AppTopbar>
      <main
        id="portal-content"
        tabIndex={-1}
        className={`portal-main ${className}`}
      >
        <section className="portal-header compact-header">
          <div className="portal-header-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {subtitle && <p className="portal-subtitle">{subtitle}</p>}
          </div>
          {headerActions}
        </section>
        {children}
      </main>
    </div>
  );
}

export function LogoutButton({ onLogout }) {
  return (
    <button className="home-link" type="button" onClick={onLogout}>
      Sign out
    </button>
  );
}

export function FormMessage({ message }) {
  if (!message?.text) return null;
  return (
    <p className={`form-message ${message.type || ""}`} role="status">
      {message.text}
    </p>
  );
}

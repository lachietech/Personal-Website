import { PortalBrand } from "./PortalBrand.jsx";

export function PortalLayout({ title, eyebrow, actions, children }) {
  return (
    <>
      <header className="portal-shell">
        <nav className="topbar" aria-label="Client portal navigation">
          <PortalBrand />
          <div className="topbar-actions">{actions}</div>
        </nav>
        <section className="portal-header compact-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        </section>
      </header>
      <main className="portal-main">{children}</main>
    </>
  );
}

export function LogoutButton({ onLogout }) {
  return (
    <button className="home-link" type="button" onClick={onLogout}>
      Sign out
    </button>
  );
}

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabbar" role="tablist" aria-label="Portal sections">
      {tabs.map((tab) => (
        <button
          className={`tab-button${activeTab === tab.id ? " active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          key={tab.id}
        >
          <i className={`bi ${tab.icon}`} aria-hidden="true" />
          {tab.label}
        </button>
      ))}
    </div>
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

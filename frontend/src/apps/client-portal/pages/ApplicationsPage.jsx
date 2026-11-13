import { portalApps } from "../utils/appRoutes.js";
import { PortalLayout, LogoutButton } from "../components/PortalLayout.jsx";
import { portalRequest } from "../api/portalApi.js";

export function ApplicationsPage({ user }) {
  return (
    <PortalLayout
      eyebrow="Your workspace"
      title={`Welcome back, ${user.username}.`}
      subtitle="Your applications, together in one place."
      actions={
        <>
          <a className="home-link" href="/clientportal/account">
            Account
          </a>
          <LogoutButton
            onLogout={async () => {
              await portalRequest("/clientportal/api/auth/logout", {
                method: "POST",
              });
              window.location.assign("/clientportal/login");
            }}
          />
        </>
      }
    >
      <section className="application-grid" aria-label="Your applications">
        {portalApps
          .filter((app) => !app.adminOnly || user.role === "admin")
          .map((app) => (
            <a
              className={`application-card application-${app.id}`}
              href={app.href}
              key={app.id}
            >
              <span className="application-icon">
                <i className={`bi ${app.icon}`} aria-hidden="true" />
              </span>
              <span className="application-kind">{app.kind}</span>
              <h2>{app.label}</h2>
              <p>{app.description}</p>
              <small>{app.detail}</small>
              <span className="application-open">
                Open application{" "}
                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </span>
            </a>
          ))}
      </section>
    </PortalLayout>
  );
}

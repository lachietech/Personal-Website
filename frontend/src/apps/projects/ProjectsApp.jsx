import { useEffect, useState } from "react";
import { PortalSession } from "../client-portal/components/PortalSession.jsx";
import { PortalLayout } from "../client-portal/components/PortalLayout.jsx";
import { portalRequest } from "../client-portal/api/portalApi.js";
import { ProjectManager } from "./components/ProjectManager.jsx";

function ProjectsWorkspace() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    portalRequest("/clientportal/api/projects/admin")
      .then((data) => {
        if (active) setProjects(data.projects);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (loading)
    return (
      <p className="portal-loading" role="status">
        Loading projects...
      </p>
    );
  if (error)
    return (
      <section className="notice warning" role="alert">
        <p>{error}</p>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Try again
        </button>
      </section>
    );
  return <ProjectManager projects={projects} setProjects={setProjects} />;
}

export function ProjectsApp() {
  return (
    <PortalSession>
      {(user) => (
        <PortalLayout
          className="projects-dashboard"
          eyebrow="Projects"
          title="Your project portfolio"
          subtitle="Manage published work and import your GitHub repositories."
          actions={
            <a className="home-link" href="/clientportal/account">
              Account
            </a>
          }
        >
          {user.role === "admin" ? (
            <ProjectsWorkspace />
          ) : (
            <section className="invoice-panel empty-state">
              <i className="bi bi-kanban" aria-hidden="true" />
              <h2>Administrator access required</h2>
              <p>Project management is available to administrator accounts.</p>
              <a className="home-link" href="/clientportal">
                Back to applications
              </a>
            </section>
          )}
        </PortalLayout>
      )}
    </PortalSession>
  );
}

import { useProjects } from "../../hooks/useProjects.js";
import { Icon } from "../Icon.jsx";

function ProjectCard({ project, index }) {
  const isExternal = /^https?:\/\//.test(project.url);
  const externalLinkProps = isExternal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <a
      href={project.url || "#contact"}
      className={`project-card project-card-text fade-up${
        project.featured ? " project-card-wide" : ""
      }`}
      {...externalLinkProps}
    >
      <div className="project-card-top">
        <span className="project-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="project-type">
          {project.type} · {project.status}
        </span>
      </div>
      <div className="project-card-body">
        <h3>{project.title}</h3>
        <p>{project.summary || "Explore this Nielsen Innovations project."}</p>
      </div>
      <div className="project-card-footer">
        {project.github?.language && (
          <span>
            <Icon name="bi-code-slash" /> {project.github.language}
          </span>
        )}
        <span className="project-arrow">
          <Icon name="bi-arrow-up-right" />
        </span>
      </div>
    </a>
  );
}

export function Projects() {
  const { projects, loading, error } = useProjects();

  return (
    <section id="portfolio" className="section portfolio-section">
      <div className="container">
        <div className="section-intro portfolio-intro fade-up">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 className="section-heading">Projects made to be used.</h2>
          </div>
          <a
            href="https://github.com/lachietech"
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            View GitHub <Icon name="bi-arrow-up-right" />
          </a>
        </div>

        {loading && <div className="projects-status">Loading projects…</div>}
        {error && <div className="projects-status">{error}</div>}
        {!loading && !error && (
          <div className="project-grid">
            {projects.map((project, index) => (
              <ProjectCard
                project={project}
                index={index}
                key={project.id || project.title}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

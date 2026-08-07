import { useEffect, useState } from "react";
import { portalRequest } from "../portalApi.js";
import { FormMessage } from "./PortalLayout.jsx";

const emptyProject = {
  title: "",
  slug: "",
  summary: "",
  type: "Project",
  status: "Live project",
  url: "",
  image: "",
  imageAlt: "",
  visualClass: "project-default",
  sortOrder: 0,
  featured: false,
  published: true,
};

export function ProjectManager({ projects, setProjects }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id || null);
  const selected = projects.find((project) => project.id === selectedId);
  const [values, setValues] = useState(selected || emptyProject);
  const [repository, setRepository] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setValues(selected || emptyProject);
  }, [selected]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function upsert(project) {
    setProjects((current) => {
      const exists = current.some((item) => item.id === project.id);
      return exists
        ? current.map((item) => (item.id === project.id ? project : item))
        : [...current, project];
    });
    setSelectedId(project.id);
  }

  async function save(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const data = await portalRequest(
        selected
          ? `/clientportal/api/projects/admin/${selected.id}`
          : "/clientportal/api/projects/admin",
        { method: selected ? "PUT" : "POST", body: values },
      );
      upsert(data.project);
      setMessage({ type: "success", text: "Project saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function importRepository(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const data = await portalRequest(
        "/clientportal/api/projects/admin/import-github",
        { method: "POST", body: { repository } },
      );
      upsert(data.project);
      setRepository("");
      setMessage({ type: "success", text: "Repository imported." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete ${selected.title}?`)) return;
    try {
      await portalRequest(`/clientportal/api/projects/admin/${selected.id}`, {
        method: "DELETE",
      });
      setProjects((current) =>
        current.filter((item) => item.id !== selected.id),
      );
      setSelectedId(null);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <section className="invoice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Website</p>
          <h2>Projects</h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setSelectedId(null)}
        >
          New project
        </button>
      </div>

      <form
        className="stack-form project-import-form"
        onSubmit={importRepository}
      >
        <label>
          Import GitHub repository
          <input
            value={repository}
            placeholder="owner/repository"
            onChange={(event) => setRepository(event.target.value)}
            required
          />
        </label>
        <button className="secondary-button" type="submit">
          Import
        </button>
      </form>

      <div className="project-admin-list">
        {projects.map((project) => (
          <button
            className={`client-card${selectedId === project.id ? " active" : ""}`}
            type="button"
            onClick={() => setSelectedId(project.id)}
            key={project.id}
          >
            <strong>{project.title}</strong>
            <span>{project.status}</span>
            <small>{project.published ? "Published" : "Hidden"}</small>
          </button>
        ))}
      </div>

      <form className="stack-form" onSubmit={save}>
        <div className="form-grid">
          {[
            ["title", "Title"],
            ["slug", "Slug"],
            ["type", "Type"],
            ["status", "Status"],
            ["url", "URL"],
            ["image", "Image path"],
            ["imageAlt", "Image description"],
            ["visualClass", "Visual class"],
          ].map(([field, label]) => (
            <label key={field}>
              {label}
              <input
                value={values[field] || ""}
                onChange={(event) => update(field, event.target.value)}
                required={field === "title"}
              />
            </label>
          ))}
          <label>
            Sort order
            <input
              type="number"
              min="0"
              value={values.sortOrder || 0}
              onChange={(event) => update("sortOrder", event.target.value)}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={values.featured || false}
              onChange={(event) => update("featured", event.target.checked)}
            />
            Featured
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={values.published !== false}
              onChange={(event) => update("published", event.target.checked)}
            />
            Published
          </label>
        </div>
        <label>
          Summary
          <textarea
            value={values.summary || ""}
            onChange={(event) => update("summary", event.target.value)}
          />
        </label>
        <div className="form-actions">
          <button className="action-button" type="submit">
            Save project
          </button>
          {selected && (
            <button className="danger-button" type="button" onClick={remove}>
              Delete project
            </button>
          )}
        </div>
        <FormMessage message={message} />
      </form>
    </section>
  );
}

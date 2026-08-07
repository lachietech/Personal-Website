import Project from "../models/Project.js";

const DEFAULT_PROJECTS = [
  ["Meander Suite", "meander-suite", "A connected suite of purpose-built digital tools.", "Product suite", "Live project", "/meandersuite", "/static/main/img/portfolio/meandersuite.png", "project-meander", true],
  ["SuperChat", "superchat", "", "Communication", "Live project", "/superchat", "/static/main/img/portfolio/superchat.png", "project-superchat", false],
  ["Sandgate Seniors", "sandgate-seniors", "", "Community", "Client website", "https://sandgateseniors.com", "/static/main/img/portfolio/sandgateseniors.png", "project-sandgate", false],
  ["HFSS Uniforms", "hfss-uniforms", "", "Operations", "Web application", "/hfssuniformsapp", "/static/main/img/portfolio/uniforms.png", "project-uniforms", false],
  ["Revolution Rumble", "revolution-rumble", "A bold digital home for a live combat-sports event.", "Events", "Client website", "https://revolutionrumble.com.au", "/static/main/img/portfolio/revolutionrumble.png", "project-rumble", true]
];

export function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export function projectPayload(body = {}) {
  const title = String(body.title || "").trim();
  if (!title) throw new Error("Project title is required");
  const slug = slugify(body.slug || title);
  if (!slug) throw new Error("A valid project slug is required");
  const url = String(body.url || "").trim();
  if (url && !/^(https?:\/\/|\/)[^\s]+$/i.test(url)) throw new Error("Project URL must be an HTTP(S) URL or a site path");
  return {
    title, slug, url,
    summary: String(body.summary || "").trim(),
    type: String(body.type || "Project").trim(),
    status: String(body.status || "Live project").trim(),
    image: String(body.image || "").trim(),
    imageAlt: String(body.imageAlt || `${title} project`).trim(),
    visualClass: String(body.visualClass || "project-default").trim().replace(/[^a-z0-9_-]/gi, ""),
    featured: Boolean(body.featured), published: body.published !== false,
    sortOrder: Math.max(0, Number.parseInt(body.sortOrder, 10) || 0),
    github: body.github || undefined
  };
}

export function serializeProject(project) {
  return {
    id: project._id.toString(), title: project.title, slug: project.slug,
    summary: project.summary, type: project.type, status: project.status,
    url: project.url, image: project.image, imageAlt: project.imageAlt,
    visualClass: project.visualClass, featured: project.featured,
    published: project.published, sortOrder: project.sortOrder, github: project.github
  };
}

export async function ensureDefaultProjects() {
  if (await Project.exists({})) return;
  await Project.insertMany(DEFAULT_PROJECTS.map((p, sortOrder) => ({
    title: p[0], slug: p[1], summary: p[2], type: p[3], status: p[4], url: p[5],
    image: p[6], imageAlt: `${p[0]} project`, visualClass: p[7], featured: p[8], sortOrder
  })), { ordered: true });
}

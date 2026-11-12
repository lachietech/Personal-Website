import Project from "../models/Project.js";

const DEFAULT_PROJECTS = [
  [
    "Meander Suite",
    "meander-suite",
    "A connected suite of purpose-built digital tools.",
    "Product suite",
    "Live project",
    "/meandersuite",
    "/static/main/img/portfolio/meandersuite.png",
    "project-meander",
    true,
  ],
  [
    "Sandgate Seniors",
    "sandgate-seniors",
    "",
    "Community",
    "Client website",
    "https://sandgateseniors.com",
    "/static/main/img/portfolio/sandgateseniors.png",
    "project-sandgate",
    false,
  ],
  [
    "HFSS Uniforms",
    "hfss-uniforms",
    "",
    "Operations",
    "Web application",
    "/hfssuniformsapp",
    "/static/main/img/portfolio/uniforms.png",
    "project-uniforms",
    false,
  ],
  [
    "Revolution Rumble",
    "revolution-rumble",
    "A bold digital home for a live combat-sports event.",
    "Events",
    "Client website",
    "https://revolutionrumble.com.au",
    "/static/main/img/portfolio/revolutionrumble.png",
    "project-rumble",
    true,
  ],
];

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function cleanProjectText(value, maxLength, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new Error("Invalid project text");
  return value.trim().slice(0, maxLength);
}

function cleanProjectUrl(value) {
  const url = cleanProjectText(value, 500);
  if (!url) return "";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error("Project URL must use HTTPS");
    }
    return parsed.toString();
  } catch (error) {
    if (error.message === "Project URL must use HTTPS") throw error;
    throw new Error("Project URL must be HTTPS or a site path");
  }
}

function cleanProjectImage(value) {
  const image = cleanProjectText(value, 500);
  if (!image) return "";
  if (!image.startsWith("/static/") || image.startsWith("//")) {
    throw new Error("Project image must use a local static asset");
  }
  return image;
}

export function projectPayload(body = {}) {
  const title = cleanProjectText(body.title, 120);
  if (!title) throw new Error("Project title is required");
  const slug = slugify(body.slug || title);
  if (!slug) throw new Error("A valid project slug is required");
  const url = cleanProjectUrl(body.url);
  const github =
    body.github && typeof body.github === "object"
      ? {
          owner: cleanProjectText(body.github.owner, 100),
          repo: cleanProjectText(body.github.repo, 100),
          stars: Math.max(0, Number.parseInt(body.github.stars, 10) || 0),
          language: cleanProjectText(body.github.language, 80),
          lastSyncedAt: body.github.lastSyncedAt
            ? new Date(body.github.lastSyncedAt)
            : null,
        }
      : undefined;
  return {
    title,
    slug,
    url,
    summary: cleanProjectText(body.summary, 500),
    type: cleanProjectText(body.type, 100, "Project"),
    status: cleanProjectText(body.status, 60, "Live project"),
    image: cleanProjectImage(body.image),
    imageAlt: cleanProjectText(body.imageAlt, 180, `${title} project`),
    visualClass: cleanProjectText(body.visualClass, 80, "project-default")
      .trim()
      .replace(/[^a-z0-9_-]/gi, ""),
    featured: Boolean(body.featured),
    published: body.published !== false,
    sortOrder: Math.max(0, Number.parseInt(body.sortOrder, 10) || 0),
    github,
  };
}

export function serializeProject(project) {
  return {
    id: project._id.toString(),
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    type: project.type,
    status: project.status,
    url: project.url,
    image: project.image,
    imageAlt: project.imageAlt,
    visualClass: project.visualClass,
    featured: project.featured,
    published: project.published,
    sortOrder: project.sortOrder,
    github: project.github,
  };
}

export async function ensureDefaultProjects() {
  await Project.deleteMany({ slug: "superchat" });
  if (await Project.exists({})) return;
  await Project.insertMany(
    DEFAULT_PROJECTS.map((p, sortOrder) => ({
      title: p[0],
      slug: p[1],
      summary: p[2],
      type: p[3],
      status: p[4],
      url: p[5],
      image: p[6],
      imageAlt: `${p[0]} project`,
      visualClass: p[7],
      featured: p[8],
      sortOrder,
    })),
    { ordered: true },
  );
}

import express from "express";
import { requirePortalAdmin, requirePortalAuth } from "../middleware/auth.js";
import Project from "../models/Project.js";
import {
  ensureDefaultProjects,
  projectPayload,
  serializeProject,
  slugify,
} from "../utils/projects.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    await ensureDefaultProjects();
    const projects = await Project.find({ published: true }).sort({
      sortOrder: 1,
      createdAt: 1,
    });
    res.json({ projects: projects.map(serializeProject) });
  } catch {
    res.status(503).json({ error: "Projects are temporarily unavailable" });
  }
});

router.use("/admin", requirePortalAuth, requirePortalAdmin);

router.get("/admin", async (_req, res) => {
  await ensureDefaultProjects();
  const projects = await Project.find().sort({ sortOrder: 1, createdAt: 1 });
  res.json({ projects: projects.map(serializeProject) });
});

router.post("/admin", async (req, res) => {
  try {
    const project = await Project.create(projectPayload(req.body));
    res.status(201).json({ project: serializeProject(project) });
  } catch (error) {
    res
      .status(error?.code === 11000 ? 409 : 400)
      .json({
        error:
          error?.code === 11000 ? "Project slug already exists" : error.message,
      });
  }
});

router.put("/admin/:projectId", async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      projectPayload(req.body),
      { new: true, runValidators: true },
    );
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json({ project: serializeProject(project) });
  } catch (error) {
    res
      .status(error?.code === 11000 ? 409 : 400)
      .json({
        error:
          error?.code === 11000 ? "Project slug already exists" : error.message,
      });
  }
});

router.delete("/admin/:projectId", async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ ok: true });
});

router.post("/admin/import-github", async (req, res) => {
  try {
    const value = String(req.body.repository || "").trim();
    const match = value.match(
      /^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i,
    );
    if (!match)
      return res
        .status(400)
        .json({ error: "Use owner/repository or a GitHub repository URL" });
    const [, owner, repo] = match;
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Nielsen-Innovations-Admin",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      return res
        .status(response.status === 404 ? 404 : 502)
        .json({
          error:
            response.status === 404
              ? "GitHub repository not found"
              : "GitHub could not be reached",
        });
    const repository = await response.json();
    const slug = slugify(repository.name);
    const values = projectPayload({
      title: repository.name,
      slug,
      summary: repository.description || "",
      type: repository.language || "Open source",
      status: repository.archived ? "Archived repository" : "GitHub project",
      url: repository.html_url,
      image: "/static/main/img/portfolio/projectcomingsoon.png",
      imageAlt: `${repository.name} repository`,
      published: true,
      github: {
        owner: repository.owner.login,
        repo: repository.name,
        stars: repository.stargazers_count || 0,
        language: repository.language || "",
        lastSyncedAt: new Date(),
      },
    });
    const project = await Project.findOneAndUpdate({ slug }, values, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
    res.status(201).json({ project: serializeProject(project) });
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message || "Unable to import repository" });
  }
});

export default router;

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { insertPromptSchema, insertBoostActionSchema, insertTagSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.get("/api/projects", async (_req, res) => {
    const allProjects = await storage.getProjects("demo");
    if (allProjects.length === 0) {
      const projects = await storage.getProjects((await storage.getUserByUsername("demo"))?.id || "");
      return res.json(projects);
    }
    res.json(allProjects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.get("/api/projects/:id/tags", async (req, res) => {
    const t = await storage.getTags(req.params.id);
    res.json(t);
  });

  app.post("/api/projects/:id/tags", async (req, res) => {
    const parsed = insertTagSchema.parse({ ...req.body, projectId: req.params.id });
    const tag = await storage.createTag(parsed);
    res.json(tag);
  });

  app.delete("/api/tags/:id", async (req, res) => {
    await storage.deleteTag(parseInt(req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/projects/:id/prompts", async (req, res) => {
    const p = await storage.getPrompts(req.params.id);
    res.json(p);
  });

  app.post("/api/projects/:id/prompts", async (req, res) => {
    const parsed = insertPromptSchema.parse({ ...req.body, projectId: req.params.id });
    const prompt = await storage.createPrompt(parsed);
    res.json(prompt);
  });

  app.patch("/api/prompts/:id", async (req, res) => {
    const prompt = await storage.updatePrompt(parseInt(req.params.id), req.body);
    res.json(prompt);
  });

  app.delete("/api/prompts/:id", async (req, res) => {
    await storage.deletePrompt(parseInt(req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/projects/:id/competitors", async (req, res) => {
    const c = await storage.getCompetitors(req.params.id);
    res.json(c);
  });

  app.get("/api/projects/:id/metrics", async (req, res) => {
    const m = await storage.getDailyMetrics(req.params.id);
    res.json(m);
  });

  app.get("/api/projects/:id/boost-actions", async (req, res) => {
    const a = await storage.getBoostActions(req.params.id);
    res.json(a);
  });

  app.post("/api/projects/:id/boost-actions", async (req, res) => {
    const parsed = insertBoostActionSchema.parse({ ...req.body, projectId: req.params.id });
    const action = await storage.createBoostAction(parsed);
    res.json(action);
  });

  app.patch("/api/boost-actions/:id", async (req, res) => {
    const action = await storage.updateBoostAction(parseInt(req.params.id), req.body);
    res.json(action);
  });

  app.get("/api/projects/:id/citations", async (req, res) => {
    const c = await storage.getCitations(req.params.id);
    res.json(c);
  });

  return httpServer;
}

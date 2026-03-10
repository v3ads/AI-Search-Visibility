import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { scrypt, timingSafeEqual } from "crypto";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { insertPromptSchema, insertBoostActionSchema, insertTagSchema } from "@shared/schema";
import { runAnalysis } from "./ai-analysis";

const AUTH_USERNAME = "virta";
const AUTH_PASSWORD_HASH = "437827299a07f71acbdae3cf2311403f:8c787d52511e60fd315f714dd0f312985c312cea153419a28addf9e346ecc95d1949e36a866d363bb1dd8e97011776d270964ed287d0618763bb645f3ed3efb2";

function verifyPassword(password: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = AUTH_PASSWORD_HASH.split(":");
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = Buffer.from(hash, "hex");
      resolve(timingSafeEqual(derivedKey, keyBuffer));
    });
  });
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authenticated) return next();
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (username === AUTH_USERNAME && await verifyPassword(password)) {
      req.session.username = username;
      req.session.authenticated = true;
      return res.json({ ok: true, username });
    }
    res.status(401).json({ message: "Invalid username or password" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session?.authenticated) {
      return res.json({ username: req.session.username });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  app.use("/api", requireAuth);

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

  app.post("/api/projects/:id/scan", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const activePrompts = (await storage.getPrompts(req.params.id)).filter((p) => p.isActive);
      if (activePrompts.length === 0) return res.status(400).json({ message: "No active prompts to analyze" });

      const run = await storage.createAnalysisRun({
        projectId: req.params.id,
        status: "running",
        totalPrompts: activePrompts.length * 4,
        completedPrompts: 0,
        modelsUsed: ["ChatGPT", "Claude", "Google Gemini", "Grok"],
      });

      res.status(202).json({ ok: true, runId: run.id });

      runAnalysis(req.params.id, run.id).catch((err) => {
        console.error("Background scan error:", err.message);
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:id/scans", async (req, res) => {
    const runs = await storage.getAnalysisRuns(req.params.id);
    res.json(runs);
  });

  app.get("/api/scans/:id", async (req, res) => {
    const run = await storage.getAnalysisRun(parseInt(req.params.id));
    if (!run) return res.status(404).json({ message: "Scan not found" });
    res.json(run);
  });

  return httpServer;
}

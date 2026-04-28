import { eq, and, desc, gte } from "drizzle-orm";
import { db } from "./db";
import {
  users, projects, tags, prompts, competitors, dailyMetrics, boostActions, citations, analysisRuns,
  type User, type InsertUser, type Project, type InsertProject,
  type Tag, type InsertTag, type Prompt, type InsertPrompt,
  type Competitor, type InsertCompetitor, type DailyMetric, type InsertDailyMetric,
  type BoostAction, type InsertBoostAction, type Citation, type InsertCitation,
  type AnalysisRun, type InsertAnalysisRun,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  getTags(projectId: string): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<void>;
  getPrompts(projectId: string): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: number, data: Partial<InsertPrompt>): Promise<Prompt>;
  deletePrompt(id: number): Promise<void>;
  getCompetitors(projectId: string): Promise<Competitor[]>;
  createCompetitor(comp: InsertCompetitor): Promise<Competitor>;
  deleteCompetitor(id: number): Promise<void>;
  getDailyMetrics(projectId: string, days?: number): Promise<DailyMetric[]>;
  createDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric>;
  getBoostActions(projectId: string): Promise<BoostAction[]>;
  createBoostAction(action: InsertBoostAction): Promise<BoostAction>;
  updateBoostAction(id: number, data: Partial<InsertBoostAction>): Promise<BoostAction>;
  getCitations(projectId: string): Promise<Citation[]>;
  createCitation(citation: InsertCitation): Promise<Citation>;
  upsertCitation(citation: InsertCitation): Promise<Citation>;
  getAnalysisRuns(projectId: string): Promise<AnalysisRun[]>;
  getAnalysisRun(id: number): Promise<AnalysisRun | undefined>;
  createAnalysisRun(run: InsertAnalysisRun): Promise<AnalysisRun>;
  updateAnalysisRun(id: number, data: Partial<AnalysisRun>): Promise<AnalysisRun>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getProjects(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    // Cascade delete all related data
    await db.delete(analysisRuns).where(eq(analysisRuns.projectId, id));
    await db.delete(dailyMetrics).where(eq(dailyMetrics.projectId, id));
    await db.delete(citations).where(eq(citations.projectId, id));
    await db.delete(boostActions).where(eq(boostActions.projectId, id));
    await db.delete(prompts).where(eq(prompts.projectId, id));
    await db.delete(tags).where(eq(tags.projectId, id));
    await db.delete(competitors).where(eq(competitors.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getTags(projectId: string): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.projectId, projectId));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [created] = await db.insert(tags).values(tag).returning();
    return created;
  }

  async deleteTag(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  async getPrompts(projectId: string): Promise<Prompt[]> {
    return db.select().from(prompts).where(eq(prompts.projectId, projectId)).orderBy(desc(prompts.createdAt));
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const [created] = await db.insert(prompts).values(prompt).returning();
    return created;
  }

  async updatePrompt(id: number, data: Partial<InsertPrompt>): Promise<Prompt> {
    const [updated] = await db.update(prompts).set(data).where(eq(prompts.id, id)).returning();
    return updated;
  }

  async deletePrompt(id: number): Promise<void> {
    await db.delete(prompts).where(eq(prompts.id, id));
  }

  async getCompetitors(projectId: string): Promise<Competitor[]> {
    return db.select().from(competitors).where(eq(competitors.projectId, projectId));
  }

  async createCompetitor(comp: InsertCompetitor): Promise<Competitor> {
    const [created] = await db.insert(competitors).values(comp).returning();
    return created;
  }

  async deleteCompetitor(id: number): Promise<void> {
    await db.delete(competitors).where(eq(competitors.id, id));
  }

  async getDailyMetrics(projectId: string, days = 90): Promise<DailyMetric[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return db
      .select()
      .from(dailyMetrics)
      .where(and(eq(dailyMetrics.projectId, projectId), gte(dailyMetrics.date, cutoffStr)))
      .orderBy(dailyMetrics.date);
  }

  async createDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric> {
    const [created] = await db.insert(dailyMetrics).values(metric).returning();
    return created;
  }

  async getBoostActions(projectId: string): Promise<BoostAction[]> {
    return db.select().from(boostActions).where(eq(boostActions.projectId, projectId)).orderBy(desc(boostActions.generatedAt));
  }

  async createBoostAction(action: InsertBoostAction): Promise<BoostAction> {
    const [created] = await db.insert(boostActions).values(action).returning();
    return created;
  }

  async updateBoostAction(id: number, data: Partial<InsertBoostAction>): Promise<BoostAction> {
    const [updated] = await db.update(boostActions).set(data).where(eq(boostActions.id, id)).returning();
    return updated;
  }

  async getCitations(projectId: string): Promise<Citation[]> {
    return db.select().from(citations).where(eq(citations.projectId, projectId)).orderBy(desc(citations.citationCount));
  }

  async createCitation(citation: InsertCitation): Promise<Citation> {
    const [created] = await db.insert(citations).values(citation).returning();
    return created;
  }

  async upsertCitation(citation: InsertCitation): Promise<Citation> {
    const existing = await db.select().from(citations).where(
      and(eq(citations.projectId, citation.projectId), eq(citations.url, citation.url))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(citations)
        .set({ citationCount: (existing[0].citationCount || 0) + 1 })
        .where(eq(citations.id, existing[0].id))
        .returning();
      return updated;
    }
    return this.createCitation(citation);
  }

  async getAnalysisRuns(projectId: string): Promise<AnalysisRun[]> {
    return db.select().from(analysisRuns)
      .where(eq(analysisRuns.projectId, projectId))
      .orderBy(desc(analysisRuns.startedAt));
  }

  async getAnalysisRun(id: number): Promise<AnalysisRun | undefined> {
    const [run] = await db.select().from(analysisRuns).where(eq(analysisRuns.id, id));
    return run;
  }

  async createAnalysisRun(run: InsertAnalysisRun): Promise<AnalysisRun> {
    const [created] = await db.insert(analysisRuns).values(run).returning();
    return created;
  }

  async updateAnalysisRun(id: number, data: Partial<AnalysisRun>): Promise<AnalysisRun> {
    const [updated] = await db.update(analysisRuns).set(data).where(eq(analysisRuns.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

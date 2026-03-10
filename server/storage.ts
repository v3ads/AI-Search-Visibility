import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, projects, tags, prompts, competitors, dailyMetrics, boostActions, citations,
  type User, type InsertUser, type Project, type InsertProject,
  type Tag, type InsertTag, type Prompt, type InsertPrompt,
  type Competitor, type InsertCompetitor, type DailyMetric, type InsertDailyMetric,
  type BoostAction, type InsertBoostAction, type Citation, type InsertCitation,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  getTags(projectId: string): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<void>;
  getPrompts(projectId: string): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: number, data: Partial<InsertPrompt>): Promise<Prompt>;
  deletePrompt(id: number): Promise<void>;
  getCompetitors(projectId: string): Promise<Competitor[]>;
  createCompetitor(comp: InsertCompetitor): Promise<Competitor>;
  getDailyMetrics(projectId: string): Promise<DailyMetric[]>;
  createDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric>;
  getBoostActions(projectId: string): Promise<BoostAction[]>;
  createBoostAction(action: InsertBoostAction): Promise<BoostAction>;
  updateBoostAction(id: number, data: Partial<InsertBoostAction>): Promise<BoostAction>;
  getCitations(projectId: string): Promise<Citation[]>;
  createCitation(citation: InsertCitation): Promise<Citation>;
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

  async getDailyMetrics(projectId: string): Promise<DailyMetric[]> {
    return db.select().from(dailyMetrics).where(eq(dailyMetrics.projectId, projectId)).orderBy(dailyMetrics.date);
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
}

export const storage = new DatabaseStorage();

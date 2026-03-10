import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, real, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: varchar("user_id").notNull(),
  domain: text("domain").notNull(),
  brandName: text("brand_name").notNull(),
  industry: text("industry"),
  country: text("country").default("US"),
  language: text("language").default("en"),
  plan: text("plan").default("starter"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  color: text("color").default("#22c55e"),
});

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  text: text("text").notNull(),
  tagId: integer("tag_id"),
  intent: text("intent").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  brandName: text("brand_name").notNull(),
  isHidden: boolean("is_hidden").default(false),
});

export const dailyMetrics = pgTable("daily_metrics", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  brandName: text("brand_name").notNull(),
  model: text("model").notNull(),
  date: date("date").notNull(),
  visibilityPct: real("visibility_pct").default(0),
  sovPct: real("sov_pct").default(0),
  avgRank: real("avg_rank").default(0),
  sentimentScore: real("sentiment_score").default(0),
  brandStrength: real("brand_strength").default(0),
});

export const boostActions = pgTable("boost_actions", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  effort: text("effort").notNull(),
  status: text("status").default("todo"),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const citations = pgTable("citations", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  pageTitle: text("page_title"),
  citationCount: integer("citation_count").default(0),
  isOwned: boolean("is_owned").default(false),
  weekChange: real("week_change").default(0),
});

export const analysisRuns = pgTable("analysis_runs", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  status: text("status").notNull().default("pending"),
  totalPrompts: integer("total_prompts").default(0),
  completedPrompts: integer("completed_prompts").default(0),
  modelsUsed: text("models_used").array(),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ createdAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true });
export const insertPromptSchema = createInsertSchema(prompts).omit({ id: true, createdAt: true });
export const insertCompetitorSchema = createInsertSchema(competitors).omit({ id: true });
export const insertDailyMetricSchema = createInsertSchema(dailyMetrics).omit({ id: true });
export const insertBoostActionSchema = createInsertSchema(boostActions).omit({ id: true, generatedAt: true });
export const insertCitationSchema = createInsertSchema(citations).omit({ id: true });
export const insertAnalysisRunSchema = createInsertSchema(analysisRuns).omit({ id: true, startedAt: true, completedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type InsertDailyMetric = z.infer<typeof insertDailyMetricSchema>;
export type BoostAction = typeof boostActions.$inferSelect;
export type InsertBoostAction = z.infer<typeof insertBoostActionSchema>;
export type Citation = typeof citations.$inferSelect;
export type InsertCitation = z.infer<typeof insertCitationSchema>;
export type AnalysisRun = typeof analysisRuns.$inferSelect;
export type InsertAnalysisRun = z.infer<typeof insertAnalysisRunSchema>;

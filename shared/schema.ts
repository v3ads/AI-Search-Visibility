import { pgTable, text, integer, boolean, timestamp, serial, varchar, real, date } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// ── Organizations ─────────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  subscriptionStatus: text("subscription_status").default("active"),
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
  // Usage limits
  maxProjects: integer("max_projects").default(1),
  maxCompetitors: integer("max_competitors").default(3),
  maxPrompts: integer("max_prompts").default(10),
  maxScansPerMonth: integer("max_scans_per_month").default(1),
  // Usage tracking
  scansThisMonth: integer("scans_this_month").default(0),
  scansResetAt: timestamp("scans_reset_at").defaultNow(),
  // Feature flags
  hasApiAccess: boolean("has_api_access").default(false),
  hasWhiteLabel: boolean("has_white_label").default(false),
  hasScheduledScans: boolean("has_scheduled_scans").default(false),
  hasAllModels: boolean("has_all_models").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Org Members ───────────────────────────────────────────────────────────────
export const orgMembers = pgTable("org_members", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"), // owner | admin | member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// ── Invitations ───────────────────────────────────────────────────────────────
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by").notNull(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Email Verification Tokens ─────────────────────────────────────────────────
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Password Reset Tokens ─────────────────────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── API Keys ──────────────────────────────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  orgId: varchar("org_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Projects ──────────────────────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: varchar("id", { length: 32 }).primaryKey(),
  orgId: varchar("org_id").notNull(),
  domain: text("domain").notNull(),
  brandName: text("brand_name").notNull(),
  industry: text("industry"),
  country: text("country").default("US"),
  language: text("language").default("en"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Scan Schedules ────────────────────────────────────────────────────────────
export const scanSchedules = pgTable("scan_schedules", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  frequency: text("frequency").notNull().default("weekly"), // daily | weekly | monthly
  dayOfWeek: integer("day_of_week").default(1),
  hour: integer("hour").default(8),
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  emailReport: boolean("email_report").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Tags ──────────────────────────────────────────────────────────────────────
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  color: text("color").default("#22c55e"),
});

// ── Prompts ───────────────────────────────────────────────────────────────────
export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  text: text("text").notNull(),
  tagId: integer("tag_id"),
  intent: text("intent").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Competitors ───────────────────────────────────────────────────────────────
export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id").notNull(),
  brandName: text("brand_name").notNull(),
  isHidden: boolean("is_hidden").default(false),
});

// ── Daily Metrics ─────────────────────────────────────────────────────────────
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

// ── Boost Actions ─────────────────────────────────────────────────────────────
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

// ── Citations ─────────────────────────────────────────────────────────────────
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

// ── Analysis Runs ─────────────────────────────────────────────────────────────
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

// ── Insert Schemas ────────────────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).pick({ email: true, passwordHash: true, name: true });
export const insertOrgSchema = createInsertSchema(organizations).omit({ createdAt: true });
export const insertOrgMemberSchema = createInsertSchema(orgMembers).omit({ id: true, joinedAt: true });
export const insertInvitationSchema = createInsertSchema(invitations).omit({ id: true, createdAt: true, acceptedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ createdAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true });
export const insertPromptSchema = createInsertSchema(prompts).omit({ id: true, createdAt: true });
export const insertCompetitorSchema = createInsertSchema(competitors).omit({ id: true });
export const insertDailyMetricSchema = createInsertSchema(dailyMetrics).omit({ id: true });
export const insertBoostActionSchema = createInsertSchema(boostActions).omit({ id: true, generatedAt: true });
export const insertCitationSchema = createInsertSchema(citations).omit({ id: true });
export const insertAnalysisRunSchema = createInsertSchema(analysisRuns).omit({ id: true, startedAt: true, completedAt: true });
export const insertScanScheduleSchema = createInsertSchema(scanSchedules).omit({ id: true, createdAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });

// ── Types ─────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrg = z.infer<typeof insertOrgSchema>;
export type OrgMember = typeof orgMembers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
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
export type ScanSchedule = typeof scanSchedules.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;

// ── Plan Config ───────────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:       { maxProjects: 1, maxCompetitors: 1,   maxPrompts: 3,   maxScansPerMonth: 1,   hasApiAccess: false, hasWhiteLabel: false, hasScheduledScans: false, hasAllModels: false },
  starter:    { maxProjects: 1, maxCompetitors: 5,   maxPrompts: 50,  maxScansPerMonth: 4,   hasApiAccess: false, hasWhiteLabel: false, hasScheduledScans: false, hasAllModels: true  },
  growth:     { maxProjects: 5, maxCompetitors: 15,  maxPrompts: 200, maxScansPerMonth: 20,  hasApiAccess: true,  hasWhiteLabel: false, hasScheduledScans: true,  hasAllModels: true  },
  agency:     { maxProjects: 25,maxCompetitors: 999, maxPrompts: 999, maxScansPerMonth: 999, hasApiAccess: true,  hasWhiteLabel: true,  hasScheduledScans: true,  hasAllModels: true  },
  enterprise: { maxProjects: 999,maxCompetitors:999, maxPrompts: 999, maxScansPerMonth: 999, hasApiAccess: true,  hasWhiteLabel: true,  hasScheduledScans: true,  hasAllModels: true  },
} as const;

// Free plan only scans these 2 models — enough to demonstrate value, not enough to act without upgrading
export const FREE_MODELS = ["ChatGPT", "Claude"] as const;

export const PLAN_PRICES: Record<string, { monthly: number; name: string; description: string; stripePriceId?: string }> = {
  free:      { monthly: 0,   name: "Free",       description: "1 scan to see how you rank in AI search" },
  starter:   { monthly: 49,  name: "Starter",    description: "For solo marketers and consultants" },
  growth:    { monthly: 149, name: "Growth",     description: "For marketing teams tracking multiple brands" },
  agency:    { monthly: 399, name: "Agency",     description: "For agencies managing multiple clients" },
  enterprise:{ monthly: 0,   name: "Enterprise", description: "Custom pricing for large organizations" },
};

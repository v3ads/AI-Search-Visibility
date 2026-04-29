import { eq, and, desc, gte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, organizations, orgMembers, invitations, passwordResetTokens,
  emailVerificationTokens,
  apiKeys, projects, tags, prompts, competitors, dailyMetrics,
  boostActions, citations, analysisRuns, scanSchedules,
  type User, type InsertUser, type Organization, type InsertOrg,
  type OrgMember, type Invitation, type Project, type InsertProject,
  type Tag, type InsertTag, type Prompt, type InsertPrompt,
  type Competitor, type InsertCompetitor, type DailyMetric, type InsertDailyMetric,
  type BoostAction, type InsertBoostAction, type Citation, type InsertCitation,
  type AnalysisRun, type InsertAnalysisRun, type ScanSchedule, type ApiKey,
  PLAN_LIMITS,
} from "@shared/schema";

// ── Users ─────────────────────────────────────────────────────────────────────

export async function createUser(data: InsertUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  return user;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return user;
}

// ── Organizations ─────────────────────────────────────────────────────────────

export async function createOrg(data: InsertOrg): Promise<Organization> {
  const [org] = await db.insert(organizations).values(data).returning();
  return org;
}

export async function getOrgById(id: string): Promise<Organization | undefined> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  return org;
}

export async function getOrgBySlug(slug: string): Promise<Organization | undefined> {
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
  return org;
}

export async function updateOrg(id: string, data: Partial<Organization>): Promise<Organization> {
  const [org] = await db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
  return org;
}

export async function getOrgsForUser(userId: string): Promise<(Organization & { role: string })[]> {
  const rows = await db
    .select({ org: organizations, role: orgMembers.role })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId));
  return rows.map((r) => ({ ...r.org, role: r.role }));
}

export async function addOrgMember(orgId: string, userId: string, role: string): Promise<OrgMember> {
  const [member] = await db.insert(orgMembers).values({ orgId, userId, role }).returning();
  return member;
}

export async function getOrgMembers(orgId: string): Promise<(OrgMember & { user: User })[]> {
  const rows = await db
    .select({ member: orgMembers, user: users })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId));
  return rows.map((r) => ({ ...r.member, user: r.user }));
}

export async function getOrgMember(orgId: string, userId: string): Promise<OrgMember | undefined> {
  const [member] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
  return member;
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  await db.delete(orgMembers).where(
    and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId))
  );
}

export async function updateOrgMemberRole(orgId: string, userId: string, role: string): Promise<void> {
  await db.update(orgMembers).set({ role }).where(
    and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId))
  );
}

// ── Invitations ───────────────────────────────────────────────────────────────

export async function createInvitation(data: {
  orgId: string; email: string; role: string; token: string;
  invitedBy: string; expiresAt: Date;
}): Promise<Invitation> {
  const [inv] = await db.insert(invitations).values(data).returning();
  return inv;
}

export async function getInvitationByToken(token: string): Promise<Invitation | undefined> {
  const [inv] = await db.select().from(invitations).where(eq(invitations.token, token));
  return inv;
}

export async function acceptInvitation(token: string): Promise<void> {
  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.token, token));
}

export async function getOrgInvitations(orgId: string): Promise<Invitation[]> {
  return db.select().from(invitations).where(
    and(eq(invitations.orgId, orgId), sql`${invitations.acceptedAt} IS NULL`)
  );
}

export async function deleteInvitation(id: number): Promise<void> {
  await db.delete(invitations).where(eq(invitations.id, id));
}

// ── Email Verification ────────────────────────────────────────────────────────

export async function createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  // Delete any existing tokens for this user first
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
  await db.insert(emailVerificationTokens).values({ userId, token, expiresAt });
}

export async function getEmailVerificationToken(token: string) {
  const [row] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
  return row;
}

export async function deleteEmailVerificationToken(userId: string): Promise<void> {
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
}

// ── Password Reset ────────────────────────────────────────────────────────────

export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getPasswordResetToken(token: string) {
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  return row;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.token, token));
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function createApiKey(data: {
  orgId: string; name: string; keyHash: string; keyPrefix: string; createdBy: string;
}): Promise<ApiKey> {
  const [key] = await db.insert(apiKeys).values(data).returning();
  return key;
}

export async function getApiKeyByHash(hash: string): Promise<ApiKey | undefined> {
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash));
  return key;
}

export async function getOrgApiKeys(orgId: string): Promise<ApiKey[]> {
  return db.select().from(apiKeys).where(eq(apiKeys.orgId, orgId)).orderBy(desc(apiKeys.createdAt));
}

export async function deleteApiKey(id: number, orgId: string): Promise<void> {
  await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, orgId)));
}

export async function updateApiKeyLastUsed(id: number): Promise<void> {
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(data: InsertProject): Promise<Project> {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
}

export async function getProject(id: string): Promise<Project | undefined> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

export async function getProjects(orgId: string): Promise<Project[]> {
  return db.select().from(projects).where(eq(projects.orgId, orgId)).orderBy(projects.createdAt);
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const [project] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  // Use a transaction so partial failures leave no orphaned data
  await db.transaction(async (tx) => {
    await tx.delete(analysisRuns).where(eq(analysisRuns.projectId, id));
    await tx.delete(dailyMetrics).where(eq(dailyMetrics.projectId, id));
    await tx.delete(citations).where(eq(citations.projectId, id));
    await tx.delete(boostActions).where(eq(boostActions.projectId, id));
    await tx.delete(prompts).where(eq(prompts.projectId, id));
    await tx.delete(tags).where(eq(tags.projectId, id));
    await tx.delete(competitors).where(eq(competitors.projectId, id));
    await tx.delete(scanSchedules).where(eq(scanSchedules.projectId, id));
    await tx.delete(projects).where(eq(projects.id, id));
  });
}

// ── Scan Schedules ────────────────────────────────────────────────────────────

export async function getScanSchedule(projectId: string): Promise<ScanSchedule | undefined> {
  const [s] = await db.select().from(scanSchedules).where(eq(scanSchedules.projectId, projectId));
  return s;
}

export async function upsertScanSchedule(projectId: string, data: Partial<ScanSchedule>): Promise<ScanSchedule> {
  const existing = await getScanSchedule(projectId);
  if (existing) {
    const [s] = await db.update(scanSchedules).set(data).where(eq(scanSchedules.projectId, projectId)).returning();
    return s;
  }
  const [s] = await db.insert(scanSchedules).values({ projectId, ...data } as any).returning();
  return s;
}

export async function getAllActiveScanSchedules(): Promise<ScanSchedule[]> {
  return db.select().from(scanSchedules).where(eq(scanSchedules.isActive, true));
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function getTags(projectId: string): Promise<Tag[]> {
  return db.select().from(tags).where(eq(tags.projectId, projectId));
}

export async function createTag(data: InsertTag): Promise<Tag> {
  const [tag] = await db.insert(tags).values(data).returning();
  return tag;
}

export async function deleteTag(id: number): Promise<void> {
  await db.delete(tags).where(eq(tags.id, id));
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export async function getPrompts(projectId: string): Promise<Prompt[]> {
  return db.select().from(prompts).where(eq(prompts.projectId, projectId)).orderBy(desc(prompts.createdAt));
}

export async function createPrompt(data: InsertPrompt): Promise<Prompt> {
  const [prompt] = await db.insert(prompts).values(data).returning();
  return prompt;
}

export async function updatePrompt(id: number, data: Partial<Prompt>): Promise<Prompt> {
  const [prompt] = await db.update(prompts).set(data).where(eq(prompts.id, id)).returning();
  return prompt;
}

export async function deletePrompt(id: number): Promise<void> {
  await db.delete(prompts).where(eq(prompts.id, id));
}

// ── Competitors ───────────────────────────────────────────────────────────────

export async function getCompetitors(projectId: string): Promise<Competitor[]> {
  return db.select().from(competitors).where(eq(competitors.projectId, projectId));
}

export async function createCompetitor(data: InsertCompetitor): Promise<Competitor> {
  const [comp] = await db.insert(competitors).values(data).returning();
  return comp;
}

export async function deleteCompetitor(id: number): Promise<void> {
  await db.delete(competitors).where(eq(competitors.id, id));
}

// ── Daily Metrics ─────────────────────────────────────────────────────────────

export async function getDailyMetrics(projectId: string, days = 90): Promise<DailyMetric[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.projectId, projectId), gte(dailyMetrics.date, cutoffStr)))
    .orderBy(dailyMetrics.date);
}

export async function createDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric> {
  const [created] = await db.insert(dailyMetrics).values(metric).returning();
  return created;
}

/**
 * Upsert a daily metric row — replaces any existing row for the same
 * (projectId, brandName, model, date) combination so multiple scans on the
 * same day don't produce duplicate rows.
 */
export async function upsertDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric> {
  const [existing] = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.projectId, metric.projectId),
        eq(dailyMetrics.brandName, metric.brandName),
        eq(dailyMetrics.model, metric.model),
        eq(dailyMetrics.date, metric.date)
      )
    );
  if (existing) {
    const [updated] = await db
      .update(dailyMetrics)
      .set(metric)
      .where(eq(dailyMetrics.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(dailyMetrics).values(metric).returning();
  return created;
}

// ── Boost Actions ─────────────────────────────────────────────────────────────

export async function getBoostActions(projectId: string): Promise<BoostAction[]> {
  return db.select().from(boostActions).where(eq(boostActions.projectId, projectId)).orderBy(desc(boostActions.generatedAt));
}

export async function createBoostAction(action: InsertBoostAction): Promise<BoostAction> {
  const [created] = await db.insert(boostActions).values(action).returning();
  return created;
}

export async function updateBoostAction(id: number, data: Partial<BoostAction>): Promise<BoostAction> {
  const [updated] = await db.update(boostActions).set(data).where(eq(boostActions.id, id)).returning();
  return updated;
}

export async function clearGeneratedBoostActions(projectId: string): Promise<void> {
  await db.delete(boostActions).where(eq(boostActions.projectId, projectId));
}

// ── Citations ─────────────────────────────────────────────────────────────────

export async function getCitations(projectId: string): Promise<Citation[]> {
  return db.select().from(citations).where(eq(citations.projectId, projectId)).orderBy(desc(citations.citationCount));
}

export async function createCitation(citation: InsertCitation): Promise<Citation> {
  const [created] = await db.insert(citations).values(citation).returning();
  return created;
}

export async function upsertCitation(citation: InsertCitation): Promise<Citation> {
  const [existing] = await db.select().from(citations).where(
    and(eq(citations.projectId, citation.projectId), eq(citations.url, citation.url))
  );
  if (existing) {
    const [updated] = await db.update(citations)
      .set({ citationCount: (existing.citationCount || 0) + 1 })
      .where(eq(citations.id, existing.id))
      .returning();
    return updated;
  }
  return createCitation(citation);
}

// ── Analysis Runs ─────────────────────────────────────────────────────────────

export async function getAnalysisRuns(projectId: string): Promise<AnalysisRun[]> {
  return db.select().from(analysisRuns)
    .where(eq(analysisRuns.projectId, projectId))
    .orderBy(desc(analysisRuns.startedAt));
}

export async function getAnalysisRun(id: number): Promise<AnalysisRun | undefined> {
  const [run] = await db.select().from(analysisRuns).where(eq(analysisRuns.id, id));
  return run;
}

export async function createAnalysisRun(run: InsertAnalysisRun): Promise<AnalysisRun> {
  const [created] = await db.insert(analysisRuns).values(run).returning();
  return created;
}

export async function updateAnalysisRun(id: number, data: Partial<AnalysisRun>): Promise<AnalysisRun> {
  const [updated] = await db.update(analysisRuns).set(data).where(eq(analysisRuns.id, id)).returning();
  return updated;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAllOrgs(): Promise<Organization[]> {
  return db.select().from(organizations).orderBy(desc(organizations.createdAt));
}

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getOrgStats(orgId: string) {
  const [projectCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.orgId, orgId));
  const [scanCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analysisRuns)
    .innerJoin(projects, eq(analysisRuns.projectId, projects.id))
    .where(eq(projects.orgId, orgId));
  return { projectCount: Number(projectCount.count), scanCount: Number(scanCount.count) };
}

// ── Plan / Usage ──────────────────────────────────────────────────────────────

export async function incrementScanCount(orgId: string): Promise<void> {
  const org = await getOrgById(orgId);
  if (!org) return;
  const now = new Date();
  const resetAt = org.scansResetAt ? new Date(org.scansResetAt) : new Date(0);
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    await db.update(organizations).set({ scansThisMonth: 1, scansResetAt: now }).where(eq(organizations.id, orgId));
  } else {
    await db.update(organizations)
      .set({ scansThisMonth: (org.scansThisMonth ?? 0) + 1 })
      .where(eq(organizations.id, orgId));
  }
}

export async function canRunScan(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const org = await getOrgById(orgId);
  if (!org) return { allowed: false, reason: "Organization not found" };
  const limits = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  const now = new Date();
  const resetAt = org.scansResetAt ? new Date(org.scansResetAt) : new Date(0);
  const scansThisMonth = (now.getMonth() === resetAt.getMonth() && now.getFullYear() === resetAt.getFullYear())
    ? (org.scansThisMonth ?? 0)
    : 0;
  if (scansThisMonth >= limits.maxScansPerMonth) {
    return {
      allowed: false,
      reason: `You've used all ${limits.maxScansPerMonth} scan${limits.maxScansPerMonth === 1 ? "" : "s"} on your ${org.plan} plan this month. Upgrade to run more scans.`,
    };
  }
  return { allowed: true };
}

// ── Legacy compat object (used by old code) ───────────────────────────────────
export const storage = {
  createUser, getUserById, getUserByEmail, updateUser,
  createOrg, getOrgById, getOrgBySlug, updateOrg, getOrgsForUser,
  addOrgMember, getOrgMembers, getOrgMember, removeOrgMember, updateOrgMemberRole,
  createInvitation, getInvitationByToken, acceptInvitation, getOrgInvitations, deleteInvitation,
  createPasswordResetToken, getPasswordResetToken, markPasswordResetTokenUsed,
  createEmailVerificationToken, getEmailVerificationToken, deleteEmailVerificationToken,
  createApiKey, getApiKeyByHash, getOrgApiKeys, deleteApiKey, updateApiKeyLastUsed,
  createProject, getProject, getProjects, updateProject, deleteProject,
  getScanSchedule, upsertScanSchedule, getAllActiveScanSchedules,
  getTags, createTag, deleteTag,
  getPrompts, createPrompt, updatePrompt, deletePrompt,
  getCompetitors, createCompetitor, deleteCompetitor,
  getDailyMetrics, createDailyMetric, upsertDailyMetric,
  getBoostActions, createBoostAction, updateBoostAction, clearGeneratedBoostActions,
  getCitations, createCitation, upsertCitation,
  getAnalysisRuns, getAnalysisRun, createAnalysisRun, updateAnalysisRun,
  getAllOrgs, getAllUsers, getOrgStats,
  incrementScanCount, canRunScan,
};

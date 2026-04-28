/**
 * Seed script — runs on every deploy via preDeployCommand.
 * Creates demo org + users if they don't exist.
 * Safe to run multiple times (idempotent).
 */
import bcrypt from "bcryptjs";
import { db } from "./db";
import {
  users, organizations, orgMembers, projects, tags, prompts, competitors,
  dailyMetrics, boostActions, citations,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

const DEMO_ORG_ID = "org_demo_acmecloud";
const DEMO_PROJECT_ID = "proj_acmecloud_demo";
const ADMIN_ORG_ID = "org_v3ads";

export async function seedDatabase() {
  // ── Admin user ─────────────────────────────────────────────────────────────
  const adminEmail = (process.env.ADMIN_EMAIL || "vipaymanshalaby@gmail.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin2024!";

  let [adminUser] = await db.select().from(users).where(eq(users.email, adminEmail));
  if (!adminUser) {
    const hash = await bcrypt.hash(adminPassword, 10);
    [adminUser] = await db.insert(users).values({
      email: adminEmail, passwordHash: hash, name: "Vipay Manshalaby", emailVerified: true,
    }).returning();
    console.log("[seed] Created admin user:", adminEmail);
  }

  // ── Demo user ──────────────────────────────────────────────────────────────
  const demoEmail = "demo@plumboost.com";
  const demoPassword = "plumboost2024";
  let [demoUser] = await db.select().from(users).where(eq(users.email, demoEmail));
  if (!demoUser) {
    const hash = await bcrypt.hash(demoPassword, 10);
    [demoUser] = await db.insert(users).values({
      email: demoEmail, passwordHash: hash, name: "Demo User", emailVerified: true,
    }).returning();
    console.log("[seed] Created demo user");
  }

  // ── Admin org ──────────────────────────────────────────────────────────────
  let [adminOrg] = await db.select().from(organizations).where(eq(organizations.id, ADMIN_ORG_ID));
  if (!adminOrg) {
    [adminOrg] = await db.insert(organizations).values({
      id: ADMIN_ORG_ID, name: "v3ads", slug: "v3ads", plan: "agency",
      maxProjects: 25, maxCompetitors: 999, maxPrompts: 999, maxScansPerMonth: 999,
      hasApiAccess: true, hasWhiteLabel: true, hasScheduledScans: true,
    }).returning();
    console.log("[seed] Created v3ads org");
  }
  const [adminOrgMember] = await db.select().from(orgMembers).where(
    and(eq(orgMembers.orgId, ADMIN_ORG_ID), eq(orgMembers.userId, adminUser.id))
  );
  if (!adminOrgMember) {
    await db.insert(orgMembers).values({ orgId: ADMIN_ORG_ID, userId: adminUser.id, role: "owner" });
  }

  // ── Demo org ───────────────────────────────────────────────────────────────
  let [demoOrg] = await db.select().from(organizations).where(eq(organizations.id, DEMO_ORG_ID));
  if (!demoOrg) {
    [demoOrg] = await db.insert(organizations).values({
      id: DEMO_ORG_ID, name: "AcmeCloud Demo", slug: "acmecloud-demo", plan: "growth",
      maxProjects: 5, maxCompetitors: 15, maxPrompts: 200, maxScansPerMonth: 20,
      hasApiAccess: true, hasWhiteLabel: false, hasScheduledScans: true,
    }).returning();
    console.log("[seed] Created demo org");
  }
  for (const [uid, role] of [[adminUser.id, "owner"], [demoUser.id, "owner"]] as [number, string][]) {
    const [m] = await db.select().from(orgMembers).where(
      and(eq(orgMembers.orgId, DEMO_ORG_ID), eq(orgMembers.userId, uid))
    );
    if (!m) await db.insert(orgMembers).values({ orgId: DEMO_ORG_ID, userId: uid, role });
  }

  // ── Demo project ───────────────────────────────────────────────────────────
  const [existingProject] = await db.select().from(projects).where(eq(projects.id, DEMO_PROJECT_ID));
  if (existingProject) {
    console.log("[seed] Done (demo project already exists).");
    return;
  }

  await db.insert(projects).values({
    id: DEMO_PROJECT_ID, orgId: DEMO_ORG_ID,
    domain: "acmecloud.io", brandName: "AcmeCloud",
    industry: "Cloud Infrastructure & SaaS", country: "US", language: "en",
  });

  // Tags
  const tagColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
  const tagNames = ["Cloud Hosting", "DevOps Tools", "Security", "Pricing", "Support"];
  const createdTags: number[] = [];
  for (let i = 0; i < tagNames.length; i++) {
    const [t] = await db.insert(tags).values({ projectId: DEMO_PROJECT_ID, name: tagNames[i], color: tagColors[i] }).returning();
    createdTags.push(t.id);
  }

  // Prompts
  const intents = ["informational", "consideration", "transactional", "branded", "post_purchase"];
  const promptTexts = [
    { text: "What is the best cloud hosting provider for startups?", tag: 0, intent: 0 },
    { text: "Compare AcmeCloud vs AWS vs Google Cloud", tag: 0, intent: 1 },
    { text: "Best DevOps automation tools 2026", tag: 1, intent: 0 },
    { text: "AcmeCloud vs Vercel for deploying web apps", tag: 1, intent: 1 },
    { text: "Buy cloud hosting with free SSL certificate", tag: 0, intent: 2 },
    { text: "AcmeCloud pricing and features", tag: 3, intent: 3 },
    { text: "How to set up CI/CD pipeline on AcmeCloud", tag: 1, intent: 4 },
    { text: "Most secure cloud platforms for enterprise", tag: 2, intent: 0 },
    { text: "Cloud hosting with best customer support", tag: 4, intent: 0 },
    { text: "AcmeCloud vs DigitalOcean performance comparison", tag: 0, intent: 1 },
    { text: "Affordable cloud hosting for small businesses", tag: 3, intent: 0 },
    { text: "Top cloud providers with Kubernetes support", tag: 1, intent: 0 },
    { text: "AcmeCloud security certifications and compliance", tag: 2, intent: 3 },
    { text: "Best cloud platform for machine learning workloads", tag: 0, intent: 0 },
    { text: "How to migrate from AWS to AcmeCloud", tag: 0, intent: 4 },
  ];
  for (const p of promptTexts) {
    await db.insert(prompts).values({
      projectId: DEMO_PROJECT_ID, text: p.text,
      tagId: createdTags[p.tag], intent: intents[p.intent], isActive: true,
    });
  }

  // Competitors
  for (const name of ["AWS", "Google Cloud", "DigitalOcean", "Vercel", "Cloudflare", "Azure"]) {
    await db.insert(competitors).values({ projectId: DEMO_PROJECT_ID, brandName: name });
  }

  // Daily metrics (30 days of demo data)
  const models = ["ChatGPT", "Claude", "Gemini", "Grok"];
  const brands = ["AcmeCloud", "AWS", "Google Cloud", "DigitalOcean", "Vercel", "Cloudflare"];
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split("T")[0];
    for (const model of models) {
      for (const brand of brands) {
        const isTarget = brand === "AcmeCloud";
        const baseVis = isTarget ? 62 : (brand === "AWS" ? 85 : 30 + Math.random() * 40);
        const baseSov = isTarget ? 28 : (brand === "AWS" ? 35 : 5 + Math.random() * 20);
        const baseRank = isTarget ? 2.3 : (brand === "AWS" ? 1.5 : 2 + Math.random() * 5);
        const baseSent = isTarget ? 72 : (brand === "AWS" ? 68 : 40 + Math.random() * 40);
        const trend = isTarget ? (29 - dayOffset) * 0.3 : (29 - dayOffset) * 0.1;
        const noise = () => (Math.random() - 0.5) * 6;
        const vis = Math.min(100, Math.max(0, baseVis + trend + noise()));
        const sov = Math.min(100, Math.max(0, baseSov + trend * 0.3 + noise() * 0.5));
        const rank = Math.max(1, baseRank - trend * 0.02 + noise() * 0.2);
        const sent = Math.min(100, Math.max(0, baseSent + trend * 0.2 + noise()));
        const rankScore = Math.max(0, 100 - (rank - 1) * 10);
        const strength = vis * 0.3 + sov * 0.25 + rankScore * 0.25 + sent * 0.2;
        await db.insert(dailyMetrics).values({
          projectId: DEMO_PROJECT_ID, brandName: brand, model, date: dateStr,
          visibilityPct: Math.round(vis * 10) / 10,
          sovPct: Math.round(sov * 10) / 10,
          avgRank: Math.round(rank * 10) / 10,
          sentimentScore: Math.round(sent * 10) / 10,
          brandStrength: Math.round(strength * 10) / 10,
        });
      }
    }
  }

  // Boost actions
  const actionData = [
    { title: "Add FAQ Schema Markup to Top Product Pages", description: "Implement structured FAQ schema (JSON-LD) on your top 10 product/feature pages. AI models heavily weight structured data when generating responses about product capabilities.", category: "Technical SEO for AI", priority: "high", effort: "medium" },
    { title: "Create Definitive 'AcmeCloud vs AWS' Comparison Guide", description: "Write a comprehensive, data-driven comparison page covering pricing tiers, performance benchmarks, feature matrix, and migration paths. This content type earns 3.2x more AI citations.", category: "Owned-Domain Citations", priority: "high", effort: "high" },
    { title: "Pitch TechRadar and G2 Cloud Hosting Category Pages", description: "AWS and Google Cloud are cited 4x more from TechRadar listicles. Submit AcmeCloud for inclusion in their 'Best Cloud Hosting 2026' roundup.", category: "PR for Listicles", priority: "high", effort: "low" },
  ];
  for (const action of actionData) {
    await db.insert(boostActions).values({ projectId: DEMO_PROJECT_ID, ...action, status: "todo" });
  }

  // Citations
  const citationData = [
    { url: "https://acmecloud.io/features", domain: "acmecloud.io", pageTitle: "AcmeCloud Features", citationCount: 47, isOwned: true, weekChange: 5.2 },
    { url: "https://techradar.com/best/cloud-hosting", domain: "techradar.com", pageTitle: "Best Cloud Hosting 2026", citationCount: 89, isOwned: false, weekChange: 1.2 },
    { url: "https://g2.com/categories/cloud-platform", domain: "g2.com", pageTitle: "Best Cloud Platform Software", citationCount: 76, isOwned: false, weekChange: -0.5 },
    { url: "https://reddit.com/r/devops", domain: "reddit.com", pageTitle: "r/devops - Best cloud provider?", citationCount: 54, isOwned: false, weekChange: 12.3 },
  ];
  for (const c of citationData) {
    await db.insert(citations).values({ projectId: DEMO_PROJECT_ID, ...c });
  }

  console.log("[seed] Database seeded successfully.");
}

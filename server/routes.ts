import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import * as storage from "./storage";
import { seedDatabase } from "./seed";
import {
  insertPromptSchema, insertBoostActionSchema, insertTagSchema,
  insertCompetitorSchema, insertProjectSchema, PLAN_LIMITS, PLAN_PRICES,
  type Prompt,
} from "@shared/schema";
import { runAnalysis } from "./ai-analysis";
import { scanEmitter, type ScanEvent } from "./scan-events";
import { generateBoostActions } from "./boost-generator";
import {
  sendWelcomeEmail, sendPasswordResetEmail, sendInvitationEmail,
  sendScanCompleteEmail,
} from "./email";
import { STRIPE_PRICE_IDS, APP_URL } from "./stripe-config";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" as any })
  : null;

// ── Rate Limiters ─────────────────────────────────────────────────────────────

/** Strict limiter for auth endpoints — prevents brute force & credential stuffing */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV !== "production",
});

/** Lighter limiter for scan triggers — prevents scan quota abuse */
const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many scan requests, slow down." },
  skip: () => process.env.NODE_ENV !== "production",
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Middleware ────────────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.authenticated && req.session?.userId) return next();
  res.status(401).json({ message: "Unauthorized" });
}

function requireOrgAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.authenticated || !req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.session?.orgId) {
    return res.status(400).json({ message: "No active organization" });
  }
  next();
}

async function requireOrgAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.authenticated || !req.session?.userId || !req.session?.orgId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const member = await storage.getOrgMember(req.session.orgId, req.session.userId);
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// API key auth middleware (for public API)
async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer pb_")) {
    return res.status(401).json({ message: "API key required" });
  }
  const rawKey = authHeader.slice(7);
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const apiKey = await storage.getApiKeyByHash(hash);
  if (!apiKey) return res.status(401).json({ message: "Invalid API key" });
  await storage.updateApiKeyLastUsed(apiKey.id);
  (req as any).apiOrgId = apiKey.orgId;
  next();
}

// ── Plan enforcement ──────────────────────────────────────────────────────────

async function checkProjectLimit(orgId: string): Promise<{ allowed: boolean; message?: string }> {
  const org = await storage.getOrgById(orgId);
  if (!org) return { allowed: false, message: "Organization not found" };
  const projects = await storage.getProjects(orgId);
  if (projects.length >= (org.maxProjects ?? 1)) {
    return { allowed: false, message: `Your plan allows a maximum of ${org.maxProjects} project(s). Upgrade to add more.` };
  }
  return { allowed: true };
}

async function checkScanLimit(orgId: string): Promise<{ allowed: boolean; message?: string }> {
  const org = await storage.getOrgById(orgId);
  if (!org) return { allowed: false, message: "Organization not found" };
  const now = new Date();
  const resetAt = org.scansResetAt ? new Date(org.scansResetAt) : new Date(0);
  const scansUsed =
    now.getMonth() === resetAt.getMonth() && now.getFullYear() === resetAt.getFullYear()
      ? (org.scansThisMonth ?? 0)
      : 0;
  if (scansUsed >= (org.maxScansPerMonth ?? 1)) {
    return { allowed: false, message: `You've used all ${org.maxScansPerMonth} scan(s) for this month. Upgrade your plan for more.` };
  }
  return { allowed: true };
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();

  // ── Auth ────────────────────────────────────────────────────────────────────

  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    try {
      const { email, password, name, orgName } = req.body;
      if (!email || !password || !name || !orgName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "An account with this email already exists" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ email: email.toLowerCase().trim(), passwordHash, name });

      // Create org
      const slug = generateSlug(orgName) + "-" + randomBytes(3).toString("hex");
      const org = await storage.createOrg({
        id: generateId("org"),
        name: orgName,
        slug,
        plan: "free",
        maxProjects: PLAN_LIMITS.free.maxProjects,
        maxCompetitors: PLAN_LIMITS.free.maxCompetitors,
        maxPrompts: PLAN_LIMITS.free.maxPrompts,
        maxScansPerMonth: PLAN_LIMITS.free.maxScansPerMonth,
        hasApiAccess: PLAN_LIMITS.free.hasApiAccess,
        hasWhiteLabel: PLAN_LIMITS.free.hasWhiteLabel,
        hasScheduledScans: PLAN_LIMITS.free.hasScheduledScans,
      });
      await storage.addOrgMember(org.id, user.id, "owner");

      // Create Stripe customer
      if (stripe) {
        try {
          const customer = await stripe.customers.create({ email: user.email, name: orgName, metadata: { orgId: org.id } });
          await storage.updateOrg(org.id, { stripeCustomerId: customer.id });
        } catch (e) { /* non-fatal */ }
      }

      req.session.userId = user.id;
      req.session.orgId = org.id;
      req.session.authenticated = true;

      await sendWelcomeEmail(user.email, user.name || name, orgName).catch(() => {});

      res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, org });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });

      // Get orgs, prefer highest-plan org as default
      const orgs = await storage.getOrgsForUser(user.id);
      const planOrder = ["enterprise", "agency", "growth", "starter", "free"];
      const sortedOrgs = [...orgs].sort((a, b) => {
        const ai = planOrder.indexOf(a.plan ?? "free");
        const bi = planOrder.indexOf(b.plan ?? "free");
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      const activeOrg = sortedOrgs[0] || orgs[0];

      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      req.session.userId = user.id;
      req.session.orgId = activeOrg?.id;
      req.session.authenticated = true;

      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        org: activeOrg || null,
        orgs,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.authenticated || !req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      const orgs = await storage.getOrgsForUser(user.id);
      const activeOrg = orgs.find((o) => o.id === req.session.orgId) || orgs[0] || null;
      res.json({
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        org: activeOrg,
        orgs,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/switch-org", requireAuth, async (req, res) => {
    const { orgId } = req.body;
    const member = await storage.getOrgMember(orgId, req.session.userId!);
    if (!member) return res.status(403).json({ message: "Not a member of this organization" });
    req.session.orgId = orgId;
    const org = await storage.getOrgById(orgId);
    res.json({ org });
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) return res.json({ ok: true }); // Don't reveal if user exists
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(user.email, user.name || "there", token).catch(() => {});
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password || password.length < 8) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const record = await storage.getPasswordResetToken(token);
      if (!record || record.usedAt || new Date(record.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Token is invalid or expired" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUser(record.userId, { passwordHash });
      await storage.markPasswordResetTokenUsed(token);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Accept invitation
  app.post("/api/auth/accept-invite", async (req, res) => {
    try {
      const { token, name, password } = req.body;
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation || invitation.acceptedAt || new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation is invalid or expired" });
      }
      let user = await storage.getUserByEmail(invitation.email);
      if (!user) {
        if (!password || password.length < 8) {
          return res.status(400).json({ message: "Password required for new accounts" });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        user = await storage.createUser({ email: invitation.email, passwordHash, name: name || invitation.email });
      }
      const existingMember = await storage.getOrgMember(invitation.orgId, user.id);
      if (!existingMember) {
        await storage.addOrgMember(invitation.orgId, user.id, invitation.role);
      }
      await storage.acceptInvitation(token);
      req.session.userId = user.id;
      req.session.orgId = invitation.orgId;
      req.session.authenticated = true;
      const org = await storage.getOrgById(invitation.orgId);
      res.json({ user: { id: user.id, email: user.email, name: user.name }, org });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get invitation details (public, by token)
  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token as string);
      if (!invitation || invitation.acceptedAt || new Date(invitation.expiresAt) < new Date()) {
        return res.status(404).json({ message: "Invitation not found or expired" });
      }
      const org = await storage.getOrgById(invitation.orgId);
      res.json({ invitation, org });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── All routes below require auth ───────────────────────────────────────────
  app.use("/api", requireAuth);

  // ── Organization ────────────────────────────────────────────────────────────

  app.get("/api/org", requireOrgAccess, async (req, res) => {
    try {
      const org = await storage.getOrgById(req.session.orgId!);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      const projects = await storage.getProjects(org.id);
      const members = await storage.getOrgMembers(org.id);
      res.json({ org, projectCount: projects.length, memberCount: members.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/org", requireOrgAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const org = await storage.updateOrg(req.session.orgId!, { name });
      res.json(org);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Team Members ────────────────────────────────────────────────────────────

  app.get("/api/org/members", requireOrgAccess, async (req, res) => {
    const members = await storage.getOrgMembers(req.session.orgId!);
    res.json(members);
  });

  app.patch("/api/org/members/:userId", requireOrgAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      await storage.updateOrgMemberRole(req.session.orgId!, req.params.userId as string, role);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/org/members/:userId", requireOrgAdmin, async (req, res) => {
    try {
      const userId = req.params.userId as string;
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "You cannot remove yourself" });
      }
      await storage.removeOrgMember(req.session.orgId!, userId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Invitations ─────────────────────────────────────────────────────────────

  app.get("/api/org/invitations", requireOrgAdmin, async (req, res) => {
    const invitations = await storage.getOrgInvitations(req.session.orgId!);
    res.json(invitations);
  });

  app.post("/api/org/invitations", requireOrgAdmin, async (req, res) => {
    try {
      const { email, role = "member" } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const invitation = await storage.createInvitation({
        orgId: req.session.orgId!, email, role, token,
        invitedBy: req.session.userId!, expiresAt,
      });
      const org = await storage.getOrgById(req.session.orgId!);
      const inviter = await storage.getUserById(req.session.userId!);
      await sendInvitationEmail(email, inviter?.name || "A teammate", org?.name || "PlumBoost", token, role).catch(() => {});
      res.json(invitation);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/org/invitations/:id", requireOrgAdmin, async (req, res) => {
    await storage.deleteInvitation(parseInt(req.params.id as string));
    res.json({ ok: true });
  });

  // ── API Keys ────────────────────────────────────────────────────────────────

  app.get("/api/org/api-keys", requireOrgAccess, async (req, res) => {
    const org = await storage.getOrgById(req.session.orgId!);
    if (!org?.hasApiAccess) return res.status(403).json({ message: "API access requires Growth plan or higher" });
    const keys = await storage.getOrgApiKeys(req.session.orgId!);
    res.json(keys);
  });

  app.post("/api/org/api-keys", requireOrgAdmin, async (req, res) => {
    try {
      const org = await storage.getOrgById(req.session.orgId!);
      if (!org?.hasApiAccess) return res.status(403).json({ message: "API access requires Growth plan or higher" });
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Name required" });
      const rawKey = "pb_" + randomBytes(32).toString("hex");
      const keyHash = createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(0, 12) + "...";
      const apiKey = await storage.createApiKey({
        orgId: req.session.orgId!, name, keyHash, keyPrefix, createdBy: req.session.userId!,
      });
      res.json({ ...apiKey, rawKey }); // Only time raw key is returned
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/org/api-keys/:id", requireOrgAdmin, async (req, res) => {
    await storage.deleteApiKey(parseInt(req.params.id as string), req.session.orgId!);
    res.json({ ok: true });
  });

  // ── Billing ─────────────────────────────────────────────────────────────────

  app.post("/api/billing/checkout", requireOrgAccess, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Billing not configured" });
      const { plan } = req.body;
      if (!["starter", "growth", "agency"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }
      const org = await storage.getOrgById(req.session.orgId!);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      const user = await storage.getUserById(req.session.userId!);

      let customerId = org.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email, name: org.name, metadata: { orgId: org.id },
        });
        customerId = customer.id;
        await storage.updateOrg(org.id, { stripeCustomerId: customerId });
      }

      const billingCycle: "monthly" | "yearly" = req.body.billing === "yearly" ? "yearly" : "monthly";
      const priceId = STRIPE_PRICE_IDS[plan]?.[billingCycle];
      if (!priceId) return res.status(400).json({ message: `No price configured for ${plan}/${billingCycle}` });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/billing`,
        metadata: { orgId: org.id, plan, billing: billingCycle },
        subscription_data: { metadata: { orgId: org.id, plan, billing: billingCycle } },
        allow_promotion_codes: true,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/billing/portal", requireOrgAccess, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Billing not configured" });
      const org = await storage.getOrgById(req.session.orgId!);
      if (!org?.stripeCustomerId) return res.status(400).json({ message: "No billing account found" });
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: `${APP_URL}/billing`,
      });
      res.json({ url: portalSession.url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Stripe webhook (no auth middleware)
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Billing not configured" });
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(503).json({ message: "Webhook secret not configured" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan;
        if (orgId && plan && PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]) {
          const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
          await storage.updateOrg(orgId, {
            plan,
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: "active",
            ...limits,
          });
        }
      } else if (event.type === "customer.subscription.updated") {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        const plan = sub.metadata?.plan;
        if (orgId) {
          const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;
          const updates: any = { subscriptionStatus: status, stripeSubscriptionId: sub.id };
          if (plan && PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]) {
            const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
            updates.plan = plan;
            Object.assign(updates, limits);
          }
          await storage.updateOrg(orgId, updates);
        }
      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          const freeLimits = PLAN_LIMITS.free;
          await storage.updateOrg(orgId, {
            plan: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            ...freeLimits,
          });
        }
      }
    } catch (err: any) {
      console.error("Webhook processing error:", err);
    }

    res.json({ received: true });
  });

  // ── Projects ────────────────────────────────────────────────────────────────

  app.get("/api/projects", requireOrgAccess, async (req, res) => {
    try {
      const projects = await storage.getProjects(req.session.orgId!);
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/projects", requireOrgAccess, async (req, res) => {
    try {
      const check = await checkProjectLimit(req.session.orgId!);
      if (!check.allowed) return res.status(403).json({ message: check.message });
      const id = generateId("proj");
      const parsed = insertProjectSchema.parse({ ...req.body, id, orgId: req.session.orgId });
      const project = await storage.createProject(parsed);
      res.status(201).json(project);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/projects/:id", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
      res.json(project);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/projects/:id", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
      const updated = await storage.updateProject(req.params.id as string, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/projects/:id", requireOrgAdmin, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
      await storage.deleteProject(req.params.id as string);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Tags ────────────────────────────────────────────────────────────────────

  app.get("/api/projects/:id/tags", requireOrgAccess, async (req, res) => {
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
    res.json(await storage.getTags(req.params.id as string));
  });

  app.post("/api/projects/:id/tags", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
      const parsed = insertTagSchema.parse({ ...req.body, projectId: req.params.id as string });
      res.json(await storage.createTag(parsed));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/tags/:id", requireOrgAccess, async (req, res) => {
    await storage.deleteTag(parseInt(req.params.id as string));
    res.json({ ok: true });
  });

  // ── Prompts ─────────────────────────────────────────────────────────────────

  app.get("/api/projects/:id/prompts", requireOrgAccess, async (req, res) => {
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
    res.json(await storage.getPrompts(req.params.id as string));
  });

  app.post("/api/projects/:id/prompts", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
      const parsed = insertPromptSchema.parse({ ...req.body, projectId: req.params.id as string });
      res.json(await storage.createPrompt(parsed));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/prompts/:id", requireOrgAccess, async (req, res) => {
    try {
      res.json(await storage.updatePrompt(parseInt(req.params.id as string), req.body));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/prompts/:id", requireOrgAccess, async (req, res) => {
    await storage.deletePrompt(parseInt(req.params.id as string));
    res.json({ ok: true });
  });

  app.post("/api/projects/:id/prompts/bulk", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });

      const { lines, intent, tagId } = req.body as { lines: string[]; intent: string; tagId?: number | null };
      if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ message: "No prompts provided" });

      // Enforce plan prompt limit
      const org = await storage.getOrgById(req.session.orgId!);
      const existing = await storage.getPrompts(req.params.id as string);
      const maxPrompts = org?.maxPrompts ?? PLAN_LIMITS.free.maxPrompts;
      const validLines = lines.map((l) => l.trim()).filter(Boolean);
      if (existing.length + validLines.length > maxPrompts) {
        return res.status(403).json({
          message: `Adding ${validLines.length} prompt(s) would exceed your plan limit of ${maxPrompts}. You have ${maxPrompts - existing.length} slot(s) remaining.`,
        });
      }

      const created: Prompt[] = [];
      for (const text of validLines) {
        created.push(
          await storage.createPrompt({
            projectId: req.params.id as string,
            text,
            intent: intent || "informational",
            tagId: tagId ?? null,
            isActive: true,
          })
        );
      }
      res.json({ created: created.length, prompts: created });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Competitors ─────────────────────────────────────────────────────────────

  app.get("/api/projects/:id/competitors", requireOrgAccess, async (req, res) => {
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
    res.json(await storage.getCompetitors(req.params.id as string));
  });

  app.post("/api/projects/:id/competitors", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
      const parsed = insertCompetitorSchema.parse({ ...req.body, projectId: req.params.id as string });
      res.json(await storage.createCompetitor(parsed));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/competitors/:id", requireOrgAccess, async (req, res) => {
    await storage.deleteCompetitor(parseInt(req.params.id as string));
    res.json({ ok: true });
  });

  // ── Metrics ─────────────────────────────────────────────────────────────────

  app.get("/api/projects/:id/metrics", requireOrgAccess, async (req, res) => {
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
    const days = parseInt(req.query.days as string) || 90;
    res.json(await storage.getDailyMetrics(req.params.id as string, days));
  });

  // ── Boost Actions ────────────────────────────────────────────────────────────

  app.get("/api/projects/:id/boost-actions", requireOrgAccess, async (req, res) => {
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
    res.json(await storage.getBoostActions(req.params.id as string));
  });

  app.post("/api/projects/:id/boost-actions", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
      const parsed = insertBoostActionSchema.parse({ ...req.body, projectId: req.params.id as string });
      res.json(await storage.createBoostAction(parsed));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/boost-actions/:id", requireOrgAccess, async (req, res) => {
    try {
      res.json(await storage.updateBoostAction(parseInt(req.params.id as string), req.body));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/projects/:id/boost-actions/generate", requireOrgAccess, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const generated = await generateBoostActions(req.params.id as string);
      await storage.clearGeneratedBoostActions(req.params.id as string);
      const saved = await Promise.all(generated.map((a) => storage.createBoostAction({ projectId: req.params.id as string, ...a, status: "todo" })));
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate boost actions" });
    }
  });

  // ── Citations ────────────────────────────────────────────────────────────────

  app.get("/api/projects/:id/citations", requireOrgAccess, async (req, res) => {
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });
    res.json(await storage.getCitations(req.params.id as string));
  });

  // ── Scans ────────────────────────────────────────────────────────────────────

  app.post("/api/projects/:id/scan", requireOrgAccess, scanLimiter, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id as string);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.orgId !== req.session.orgId) return res.status(403).json({ message: "Access denied" });

      const scanCheck = await checkScanLimit(req.session.orgId!);
      if (!scanCheck.allowed) return res.status(403).json({ message: scanCheck.message });

      const activePrompts = (await storage.getPrompts(req.params.id as string)).filter((p) => p.isActive);
      if (activePrompts.length === 0) return res.status(400).json({ message: "No active prompts to analyze" });

      // Create the run first, then increment — if run creation fails we don't waste a scan
      const run = await storage.createAnalysisRun({
        projectId: req.params.id as string,
        status: "running",
        totalPrompts: activePrompts.length * 4,
        completedPrompts: 0,
        modelsUsed: ["ChatGPT", "Claude", "Google Gemini", "Grok"],
      });

      // Increment only after run record exists
      await storage.incrementScanCount(req.session.orgId!);

      res.status(202).json({ ok: true, runId: run.id });

      runAnalysis(req.params.id as string, run.id).then(async () => {
        const user = await storage.getUserById(req.session.userId!);
        if (user) {
          await sendScanCompleteEmail(user.email, user.name || "there", project.brandName, run.id)
            .catch((err) => console.error("[email] scan complete email failed:", err));
        }
      }).catch((err) => {
        console.error("Background scan error:", err.message);
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:id/scans", requireOrgAccess, async (req, res) => {
    res.json(await storage.getAnalysisRuns(req.params.id as string));
  });

  app.get("/api/scans/:id", requireOrgAccess, async (req, res) => {
    const run = await storage.getAnalysisRun(parseInt(req.params.id as string));
    if (!run) return res.status(404).json({ message: "Scan not found" });
    res.json(run);
  });

  app.get("/api/scans/:id/progress", requireAuth, async (req, res) => {
    const runId = parseInt(req.params.id as string);

    // Verify the requesting user's org owns this scan run
    const run = await storage.getAnalysisRun(runId);
    if (!run) return res.status(404).json({ message: "Scan not found" });
    const project = await storage.getProject(run.projectId);
    if (!project || project.orgId !== req.session.orgId) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const heartbeat = setInterval(() => res.write("event: heartbeat\ndata: {}\n\n"), 15000);

    const listener = (event: ScanEvent) => {
      if (event.runId !== runId) return;
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      if (event.type === "complete" || event.type === "failed") cleanup();
    };

    const cleanup = () => {
      clearInterval(heartbeat);
      scanEmitter.off("scan", listener);
      res.end();
    };

    scanEmitter.on("scan", listener);
    req.on("close", cleanup);
  });

  // ── Scan Schedules ───────────────────────────────────────────────────────────

  app.get("/api/projects/:id/schedule", requireOrgAccess, async (req, res) => {
    const schedule = await storage.getScanSchedule(req.params.id as string);
    res.json(schedule || null);
  });

  app.put("/api/projects/:id/schedule", requireOrgAccess, async (req, res) => {
    try {
      const org = await storage.getOrgById(req.session.orgId!);
      if (!org?.hasScheduledScans) return res.status(403).json({ message: "Scheduled scans require Growth plan or higher" });
      const schedule = await storage.upsertScanSchedule(req.params.id as string, req.body);
      res.json(schedule);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── User Profile ─────────────────────────────────────────────────────────────

  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const user = await storage.updateUser(req.session.userId!, { name });
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters" });
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { passwordHash });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });


  // ── Admin ────────────────────────────────────────────────────────────────────

  // ADMIN_EMAILS must be set via environment variable — no hardcoded fallback
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

  async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    const user = await storage.getUserById(req.session.userId!);
    if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return res.status(403).json({ message: "Super admin access required" });
    }
    next();
  }


  app.get("/api/admin/stats", requireSuperAdmin, async (req, res) => {
    try {
      const orgs = await storage.getAllOrgs();
      const users = await storage.getAllUsers();
      const planDistribution: Record<string, number> = {};
      for (const org of orgs) {
        planDistribution[org.plan] = (planDistribution[org.plan] || 0) + 1;
      }
      res.json({
        totalOrgs: orgs.length,
        totalUsers: users.length,
        totalProjects: 0,
        totalScans: 0,
        planDistribution,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.get("/api/admin/orgs", requireSuperAdmin, async (req, res) => {
    const orgs = await storage.getAllOrgs();
    res.json(orgs);
  });

  app.get("/api/admin/users", requireSuperAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/admin/orgs/:id", requireSuperAdmin, async (req, res) => {
    try {
      const org = await storage.updateOrg(req.params.id as string, req.body);
      res.json(org);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Public REST API (API key auth) ───────────────────────────────────────────

  app.get("/v1/projects", requireApiKey, async (req, res) => {
    const orgId = (req as any).apiOrgId;
    const projects = await storage.getProjects(orgId);
    res.json({ data: projects });
  });

  app.get("/v1/projects/:id/scans", requireApiKey, async (req, res) => {
    const orgId = (req as any).apiOrgId;
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== orgId) return res.status(404).json({ message: "Project not found" });
    const scans = await storage.getAnalysisRuns(req.params.id as string);
    res.json({ data: scans });
  });

  app.get("/v1/projects/:id/metrics", requireApiKey, async (req, res) => {
    const orgId = (req as any).apiOrgId;
    const project = await storage.getProject(req.params.id as string);
    if (!project || project.orgId !== orgId) return res.status(404).json({ message: "Project not found" });
    const days = parseInt(req.query.days as string) || 30;
    const metrics = await storage.getDailyMetrics(req.params.id as string, days);
    res.json({ data: metrics });
  });

  return httpServer;
}

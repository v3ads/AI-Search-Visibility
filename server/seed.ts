import { db } from "./db";
import { projects, tags, prompts, competitors, dailyMetrics, boostActions, citations, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEMO_PROJECT_ID = "demo_project_001";
const VIRTA_USERNAME = "virta";

export async function seedDatabase() {
  // Ensure the virta user exists in the DB (auth uses hardcoded hash in routes.ts)
  let [virtaUser] = await db.select().from(users).where(eq(users.username, VIRTA_USERNAME));
  if (!virtaUser) {
    [virtaUser] = await db.insert(users).values({
      username: VIRTA_USERNAME,
      password: "placeholder",
    }).returning();
  }

  // Check if demo project already exists
  const [existingProject] = await db.select().from(projects).where(eq(projects.id, DEMO_PROJECT_ID));
  if (existingProject) {
    // Re-assign to virta if it was owned by a legacy demo user
    if (existingProject.userId !== virtaUser.id) {
      await db.update(projects).set({ userId: virtaUser.id }).where(eq(projects.id, DEMO_PROJECT_ID));
    }
    return;
  }

  const projectId = DEMO_PROJECT_ID;
  await db.insert(projects).values({
    id: projectId,
    userId: virtaUser.id,
    domain: "acmecloud.io",
    brandName: "AcmeCloud",
    industry: "Cloud Infrastructure & SaaS",
    country: "US",
    language: "en",
    plan: "pro",
  });

  const tagColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
  const tagNames = ["Cloud Hosting", "DevOps Tools", "Security", "Pricing", "Support"];
  const createdTags: number[] = [];
  for (let i = 0; i < tagNames.length; i++) {
    const [t] = await db.insert(tags).values({
      projectId, name: tagNames[i], color: tagColors[i],
    }).returning();
    createdTags.push(t.id);
  }

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
    { text: "Cloud hosting with built-in DDoS protection", tag: 2, intent: 0 },
    { text: "AcmeCloud customer reviews and ratings", tag: 4, intent: 3 },
    { text: "Cheapest cloud hosting plans 2026", tag: 3, intent: 2 },
    { text: "Best managed database hosting providers", tag: 1, intent: 0 },
    { text: "Enterprise cloud solutions with SLA guarantees", tag: 4, intent: 1 },
  ];

  for (const p of promptTexts) {
    await db.insert(prompts).values({
      projectId, text: p.text, tagId: createdTags[p.tag], intent: intents[p.intent], isActive: true,
    });
  }

  const compNames = ["AWS", "Google Cloud", "DigitalOcean", "Vercel", "Cloudflare", "Azure", "Linode", "Heroku"];
  for (const name of compNames) {
    await db.insert(competitors).values({ projectId, brandName: name, isHidden: false });
  }

  const models = ["ChatGPT (Web)", "ChatGPT", "Perplexity Sonar", "Google Gemini", "Claude"];
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
          projectId, brandName: brand, model, date: dateStr,
          visibilityPct: Math.round(vis * 10) / 10,
          sovPct: Math.round(sov * 10) / 10,
          avgRank: Math.round(rank * 10) / 10,
          sentimentScore: Math.round(sent * 10) / 10,
          brandStrength: Math.round(strength * 10) / 10,
        });
      }
    }
  }

  const actionData = [
    {
      title: "Add FAQ Schema Markup to Top Product Pages",
      description: "Implement structured FAQ schema (JSON-LD) on your top 10 product/feature pages. AI models heavily weight structured data when generating responses about product capabilities. Focus on pages targeting Informational intent prompts where AcmeCloud currently has low visibility.",
      category: "Technical SEO for AI", priority: "high", effort: "medium",
    },
    {
      title: "Create Definitive 'AcmeCloud vs AWS' Comparison Guide",
      description: "Write a comprehensive, data-driven comparison page on acmecloud.io/compare/aws covering pricing tiers, performance benchmarks, feature matrix, and migration paths. This content type earns 3.2x more AI citations than generic blog posts for Consideration intent queries.",
      category: "Owned-Domain Citations", priority: "high", effort: "high",
    },
    {
      title: "Pitch TechRadar and G2 Cloud Hosting Category Pages",
      description: "AWS and Google Cloud are cited 4x more from TechRadar listicles. Submit AcmeCloud for inclusion in their 'Best Cloud Hosting 2026' roundup. Prepare a press kit with benchmarks, customer logos, and unique differentiators for the editorial team.",
      category: "PR for Listicles", priority: "high", effort: "low",
    },
    {
      title: "Create Authoritative Reddit Thread on r/devops",
      description: "Build presence on r/devops and r/webdev by creating detailed, genuinely helpful threads answering the top 5 tracked Informational prompts. Focus on CI/CD pipeline setup and Kubernetes deployment topics where AcmeCloud has unique advantages.",
      category: "Social & Forum", priority: "medium", effort: "low",
    },
    {
      title: "Partner with Cloud Infrastructure YouTuber for Review",
      description: "Fireship and TechWorld with Nana's content is cited in 8 of your tracked prompts by Perplexity and ChatGPT. Sponsor a hands-on deployment tutorial showcasing AcmeCloud's developer experience vs. AWS complexity.",
      category: "Influencer Outreach", priority: "medium", effort: "high",
    },
    {
      title: "Add LLM Citation Blocks to Pillar Content Pages",
      description: "Add concise, quotable summary blocks at the top of your 5 highest-traffic pillar pages. Format them as TL;DR sections that AI models can directly extract and cite. Include specific stats, pricing, and feature comparisons.",
      category: "Technical SEO for AI", priority: "medium", effort: "low",
    },
    {
      title: "Build Interactive Cloud Cost Calculator Tool",
      description: "Create an embeddable cost calculator at acmecloud.io/calculator that compares AcmeCloud pricing against AWS, GCP, and Azure. Interactive tools earn 2.8x more backlinks and AI citations than static pricing pages.",
      category: "Owned-Domain Citations", priority: "low", effort: "high",
    },
  ];

  for (const action of actionData) {
    await db.insert(boostActions).values({ projectId, ...action, status: "todo" });
  }

  const citationData = [
    { url: "https://acmecloud.io/features", domain: "acmecloud.io", pageTitle: "AcmeCloud Features & Capabilities", citationCount: 47, isOwned: true, weekChange: 5.2 },
    { url: "https://acmecloud.io/pricing", domain: "acmecloud.io", pageTitle: "AcmeCloud Pricing Plans", citationCount: 38, isOwned: true, weekChange: 3.1 },
    { url: "https://acmecloud.io/docs/getting-started", domain: "acmecloud.io", pageTitle: "Getting Started Guide", citationCount: 31, isOwned: true, weekChange: -1.5 },
    { url: "https://acmecloud.io/compare/aws", domain: "acmecloud.io", pageTitle: "AcmeCloud vs AWS Comparison", citationCount: 28, isOwned: true, weekChange: 8.4 },
    { url: "https://acmecloud.io/blog/kubernetes-deploy", domain: "acmecloud.io", pageTitle: "Deploy to Kubernetes in 5 Minutes", citationCount: 22, isOwned: true, weekChange: 2.0 },
    { url: "https://techradar.com/best/cloud-hosting", domain: "techradar.com", pageTitle: "Best Cloud Hosting Services 2026", citationCount: 89, isOwned: false, weekChange: 1.2 },
    { url: "https://g2.com/categories/cloud-platform", domain: "g2.com", pageTitle: "Best Cloud Platform Software", citationCount: 76, isOwned: false, weekChange: -0.5 },
    { url: "https://reddit.com/r/devops/comments/best-cloud", domain: "reddit.com", pageTitle: "r/devops - What cloud provider do you use?", citationCount: 54, isOwned: false, weekChange: 12.3 },
    { url: "https://stackoverflow.com/questions/cloud-hosting", domain: "stackoverflow.com", pageTitle: "Cloud hosting comparison for web apps", citationCount: 43, isOwned: false, weekChange: -2.1 },
    { url: "https://youtube.com/watch?v=cloud-review", domain: "youtube.com", pageTitle: "Fireship - Cloud Hosting in 100 Seconds", citationCount: 38, isOwned: false, weekChange: 5.7 },
    { url: "https://aws.amazon.com/ec2", domain: "aws.amazon.com", pageTitle: "Amazon EC2 - Cloud Computing", citationCount: 112, isOwned: false, weekChange: 0.3 },
    { url: "https://cloud.google.com/compute", domain: "cloud.google.com", pageTitle: "Google Compute Engine", citationCount: 95, isOwned: false, weekChange: -1.0 },
  ];

  for (const c of citationData) {
    await db.insert(citations).values({ projectId, ...c });
  }

  console.log("Database seeded successfully");
}

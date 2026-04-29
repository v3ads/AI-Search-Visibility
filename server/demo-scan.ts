/**
 * Demo scan engine — runs a real but lightweight AI scan for the landing page.
 * No auth, no DB writes. Pure in-memory. Results expire after 10 minutes.
 * Rate-limited by IP upstream in routes.ts.
 */

import { callOpenRouter, callOpenRouterJSON } from "./openrouter";
import { getSitePrompts, getSiteCompetitors, getFallbackPrompts } from "./site-intelligence";
import { log } from "./index";

const DEMO_MODELS: Record<string, string> = {
  "ChatGPT": "openai/gpt-4o-mini",
  "Claude":  "anthropic/claude-haiku-4-5-20251001",
};

function sanitize(s: string, max = 120): string {
  return s.replace(/["""''`\x00-\x1F]/g, "").slice(0, max).trim();
}

// ── Prompt generation ─────────────────────────────────────────────────────────

async function getDemoPrompts(
  brandName: string,
  domain: string,
  industry: string
): Promise<{ prompts: string[]; contextNote: string; competitors: string[] }> {
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const [{ prompts, siteContext }, competitors] = await Promise.all([
        getSitePrompts(domain, brandName, 3, true),
        getSiteCompetitors(domain, brandName, industry).catch(() => [] as string[]),
      ]);
      if (prompts.length >= 2) {
        const locationParts = [siteContext.neighborhood, siteContext.location].filter(Boolean);
        const note = locationParts.length > 0
          ? `${siteContext.subcategory || siteContext.category} in ${locationParts.join(", ")}`
          : siteContext.subcategory || siteContext.category;
        return { prompts, contextNote: note, competitors: competitors.slice(0, 1) };
      }
    } catch (err: any) {
      log(`[demo-scan] Firecrawl failed, using fallback: ${err.message}`, "demo");
    }
  }
  const prompts = await getFallbackPrompts(brandName, industry, 3);
  return { prompts, contextNote: industry, competitors: [] };
}

// ── Result types ──────────────────────────────────────────────────────────────

export interface CompetitorResult {
  name: string;
  visibilityPct: number;
  mentionedBy: string[];
}

export interface DemoScanResult {
  id: string;
  status: "running" | "complete" | "failed";
  brandName: string;
  domain: string;
  promptsUsed?: string[];
  progress: { model: string; done: boolean; error?: boolean }[];
  result?: {
    visibilityPct: number;
    sovPct: number;
    sentimentScore: number;
    avgRank: number;
    mentionedBy: string[];
    competitor?: CompetitorResult;  // one real competitor for comparison
  };
  error?: string;
  createdAt: number;
}

// ── In-memory store ───────────────────────────────────────────────────────────

const demoResults = new Map<string, DemoScanResult>();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const id of Array.from(demoResults.keys())) {
    const scan = demoResults.get(id);
    if (scan && scan.createdAt < cutoff) demoResults.delete(id);
  }
}, 5 * 60 * 1000);

export function getDemoScan(id: string): DemoScanResult | undefined {
  return demoResults.get(id);
}

// ── Core scan logic ───────────────────────────────────────────────────────────

interface BrandAccumulator {
  visibility: number;
  total: number;
  ranks: number[];
  sentiments: number[];  // only populated when brand is mentioned
}

async function scanBrand(
  brandName: string,
  prompts: string[],
): Promise<{ acc: Record<string, BrandAccumulator>; mentionedBy: string[] }> {
  const acc: Record<string, BrandAccumulator> = {};
  for (const model of Object.keys(DEMO_MODELS)) {
    acc[model] = { visibility: 0, total: 0, ranks: [], sentiments: [] };
  }

  for (const [modelName, modelId] of Object.entries(DEMO_MODELS)) {
    for (const promptText of prompts) {
      try {
        const aiResponse = await callOpenRouter(
          modelId,
          [{ role: "user", content: promptText }],
          { maxTokens: 600, temperature: 0.7 }
        );

        const extractPrompt = `You are a brand analysis engine. Analyze this AI response for mentions of "${brandName}".

USER QUERY: "${promptText}"

AI RESPONSE:
"""
${aiResponse.slice(0, 3000)}
"""

Return ONLY valid JSON (no markdown):
{
  "mentioned": true_or_false,
  "rank": position_1_to_10_or_0_if_not_mentioned,
  "sentimentScore": 0_to_100
}

Rules:
- mentioned: true if the brand name appears anywhere in the response
- rank: 1 = first mentioned/recommended, 2 = second, etc., 0 = not mentioned
- sentimentScore: only meaningful if mentioned — 0=very negative, 50=neutral, 100=very positive
- If not mentioned: rank=0, sentimentScore=50`;

        const analysis = await callOpenRouterJSON<{
          mentioned: boolean;
          rank: number;
          sentimentScore: number;
        }>(
          "openai/gpt-4o-mini",
          [{ role: "user", content: extractPrompt }],
          { maxTokens: 100, temperature: 0 }
        );

        acc[modelName].total++;
        if (analysis.mentioned) {
          acc[modelName].visibility++;
          if (analysis.rank > 0) acc[modelName].ranks.push(Math.min(10, Math.max(1, analysis.rank)));
          // ✅ Only push sentiment when actually mentioned
          acc[modelName].sentiments.push(Math.min(100, Math.max(0, analysis.sentimentScore)));
        }
        // Non-mentions do NOT contribute to sentiment average

      } catch (err: any) {
        log(`[demo-scan] ${modelName} error: ${err.message}`, "demo");
        acc[modelName].total++;
      }
    }
  }

  const mentionedBy = Object.keys(DEMO_MODELS).filter(m => acc[m].visibility > 0);
  return { acc, mentionedBy };
}

function aggregateResults(acc: Record<string, BrandAccumulator>) {
  const allModels = Object.keys(DEMO_MODELS);
  const totalPrompts = allModels.reduce((s, m) => s + acc[m].total, 0);
  const totalVisible = allModels.reduce((s, m) => s + acc[m].visibility, 0);
  const allRanks = allModels.flatMap(m => acc[m].ranks);
  // ✅ Only use sentiments from prompts where brand was mentioned
  const allSentiments = allModels.flatMap(m => acc[m].sentiments);

  const visibilityPct = totalPrompts > 0 ? Math.round((totalVisible / totalPrompts) * 100) : 0;
  const avgRank = allRanks.length > 0
    ? Math.round((allRanks.reduce((a, b) => a + b, 0) / allRanks.length) * 10) / 10
    : 0;
  // ✅ Default to null (not 50) when no mentions — shown as "N/A" on frontend
  const sentimentScore = allSentiments.length > 0
    ? Math.round(allSentiments.reduce((a, b) => a + b, 0) / allSentiments.length)
    : null;

  return { visibilityPct, avgRank, sentimentScore, totalVisible, totalPrompts };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function startDemoScan(
  id: string,
  brandName: string,
  domain: string,
  industry: string
): Promise<void> {
  const safe = {
    brand: sanitize(brandName, 80),
    domain: sanitize(domain, 100),
    industry: sanitize(industry, 80),
  };

  const scan: DemoScanResult = {
    id,
    status: "running",
    brandName: safe.brand,
    domain: safe.domain,
    progress: Object.keys(DEMO_MODELS).map(m => ({ model: m, done: false })),
    createdAt: Date.now(),
  };
  demoResults.set(id, scan);

  // Generate site-specific prompts + get 1 competitor (in parallel)
  let prompts: string[];
  let competitors: string[];
  try {
    ({ prompts, competitors } = await getDemoPrompts(safe.brand, safe.domain, safe.industry));
    log(`[demo-scan] ${id} prompts: ${prompts.length}, competitor: ${competitors[0] || "none"}`, "demo");
  } catch (err: any) {
    log(`[demo-scan] prompt generation failed: ${err.message}`, "demo");
    prompts = [
      `best ${safe.industry} options`,
      `top ${safe.industry} recommendations`,
      `${safe.industry} worth trying`,
    ];
    competitors = [];
  }

  scan.promptsUsed = prompts;
  demoResults.set(id, { ...scan });

  try {
    // Scan main brand + optionally 1 competitor (concurrently for speed)
    const scanPromises: Promise<any>[] = [
      scanBrand(safe.brand, prompts),
    ];

    // Only scan competitor on non-probe prompts (skip the "What do you know about X?" one)
    const comparativePrompts = prompts.filter(p =>
      !p.toLowerCase().includes(safe.brand.toLowerCase())
    );
    const competitorName = competitors[0];
    if (competitorName && comparativePrompts.length > 0) {
      scanPromises.push(scanBrand(competitorName, comparativePrompts));
    }

    // Update progress as models complete — poll every second
    const progressInterval = setInterval(() => {
      // Progress is updated inside scanBrand — just keep the record fresh
      demoResults.set(id, { ...scan });
    }, 1000);

    const [brandResult, competitorResult] = await Promise.all(scanPromises);
    clearInterval(progressInterval);

    // Mark all models done
    scan.progress = scan.progress.map(p => ({ ...p, done: true }));
    demoResults.set(id, { ...scan });

    // Aggregate brand metrics
    const { acc, mentionedBy } = brandResult;
    const { visibilityPct, avgRank, sentimentScore, totalVisible, totalPrompts } = aggregateResults(acc);

    // Aggregate competitor metrics
    let competitor: CompetitorResult | undefined;
    if (competitorResult && competitorName) {
      const { acc: compAcc, mentionedBy: compMentionedBy } = competitorResult;
      const compTotalPrompts = Object.keys(DEMO_MODELS).reduce((s, m) => s + compAcc[m].total, 0);
      const compTotalVisible = Object.keys(DEMO_MODELS).reduce((s, m) => s + compAcc[m].visibility, 0);
      const compVisibility = compTotalPrompts > 0 ? Math.round((compTotalVisible / compTotalPrompts) * 100) : 0;
      competitor = { name: competitorName, visibilityPct: compVisibility, mentionedBy: compMentionedBy };
    }

    // Real SoV: brand vs brand+competitor mentions
    const compVisible = competitor
      ? Object.keys(DEMO_MODELS).reduce((s, m) => {
          // re-derive from competitor result
          return s + (competitorResult?.acc[m]?.visibility || 0);
        }, 0)
      : 0;
    const totalMentions = totalVisible + compVisible;
    const sovPct = totalMentions > 0
      ? Math.round((totalVisible / totalMentions) * 100)
      : visibilityPct > 0 ? 100 : 0;

    const finalScan: DemoScanResult = {
      ...scan,
      status: "complete",
      result: {
        visibilityPct,
        sovPct,
        sentimentScore: sentimentScore ?? -1,  // -1 = not mentioned (frontend shows N/A)
        avgRank,
        mentionedBy,
        competitor,
      },
    };
    demoResults.set(id, finalScan);
    log(`[demo-scan] ${id} complete: brand=${visibilityPct}% sentiment=${sentimentScore} comp=${competitor?.name}=${competitor?.visibilityPct}%`, "demo");

  } catch (err: any) {
    log(`[demo-scan] ${id} failed: ${err.message}`, "demo");
    demoResults.set(id, { ...scan, status: "failed", error: "Scan failed. Please try again." });
  }
}

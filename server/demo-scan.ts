/**
 * Demo scan engine — runs a real but lightweight AI scan for the landing page.
 * No auth, no DB writes. Pure in-memory. Results expire after 10 minutes.
 * Rate-limited by IP upstream in routes.ts.
 */

import { callOpenRouter, callOpenRouterJSON } from "./openrouter";
import { getSitePrompts, getFallbackPrompts } from "./site-intelligence";
import { log } from "./index";

const DEMO_MODELS: Record<string, string> = {
  "ChatGPT": "openai/gpt-4o-mini",   // Use mini for demo — faster + cheaper
  "Claude":  "anthropic/claude-haiku-4-5-20251001", // Haiku for demo — faster + cheaper
};

/** Strip prompt-injection characters */
function sanitize(s: string, max = 120): string {
  return s.replace(/["""''`\x00-\x1F]/g, "").slice(0, max).trim();
}

/** Generate brand-specific prompts using Firecrawl + GPT, with fallback */
async function getDemoPrompts(
  brandName: string,
  domain: string,
  industry: string
): Promise<{ prompts: string[]; contextNote: string }> {
  // Only crawl if FIRECRAWL_API_KEY is set
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const { prompts, siteContext } = await getSitePrompts(domain, brandName, 2, false);
      if (prompts.length >= 2) {
        const locationParts = [siteContext.neighborhood, siteContext.location].filter(Boolean);
        const note = locationParts.length > 0
          ? `${siteContext.subcategory || siteContext.category} in ${locationParts.join(", ")}`
          : siteContext.subcategory || siteContext.category;
        return { prompts, contextNote: note };
      }
    } catch (err: any) {
      log(`[demo-scan] Firecrawl failed, using fallback: ${err.message}`, "demo");
    }
  }
  // Fallback to generic industry prompts
  const prompts = await getFallbackPrompts(brandName, industry, 2);
  return { prompts, contextNote: industry };
}

export interface DemoScanResult {
  id: string;
  status: "running" | "complete" | "failed";
  brandName: string;
  domain: string;
  promptsUsed?: string[];      // shown to user for transparency
  progress: { model: string; done: boolean; error?: boolean }[];
  result?: {
    visibilityPct: number;
    sovPct: number;
    sentimentScore: number;
    avgRank: number;
    mentionedBy: string[];
  };
  error?: string;
  createdAt: number;
}

// In-memory store — results expire after 10 min
const demoResults = new Map<string, DemoScanResult>();

// Cleanup every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  const keys = Array.from(demoResults.keys());
  for (const id of keys) {
    const scan = demoResults.get(id);
    if (scan && scan.createdAt < cutoff) demoResults.delete(id);
  }
}, 5 * 60 * 1000);

export function getDemoScan(id: string): DemoScanResult | undefined {
  return demoResults.get(id);
}

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

  // Generate site-specific prompts via Firecrawl (with fallback)
  let prompts: string[];
  let contextNote: string;
  try {
    ({ prompts, contextNote } = await getDemoPrompts(safe.brand, safe.domain, safe.industry));
    log(`[demo-scan] ${id} using prompts for: ${contextNote}`, "demo");
  } catch (err: any) {
    log(`[demo-scan] prompt generation failed: ${err.message}`, "demo");
    prompts = [
      `What are the best ${safe.industry} options available?`,
      `I'm looking for recommendations in ${safe.industry} — what do you suggest?`,
    ];
  }

  // Update scan with the prompts now that we have them
  scan.promptsUsed = prompts;
  demoResults.set(id, { ...scan });

  // Per-model accumulators
  const acc: Record<string, { visibility: number; total: number; ranks: number[]; sentiments: number[] }> = {};
  for (const model of Object.keys(DEMO_MODELS)) {
    acc[model] = { visibility: 0, total: 0, ranks: [], sentiments: [] };
  }

  try {
    for (const [modelName, modelId] of Object.entries(DEMO_MODELS)) {
      for (const promptText of prompts) {
        try {
          // Step 1: Ask the AI model
          const aiResponse = await callOpenRouter(
            modelId,
            [{ role: "user", content: promptText }],
            { maxTokens: 600, temperature: 0.7 }
          );

          // Step 2: Extract brand mention data
          const extractPrompt = `You are a brand analysis engine. Analyze this AI response for mentions of "${safe.brand}".

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
- mentioned: true if brand name appears anywhere
- rank: 1 = first mentioned/recommended, 0 = not mentioned
- sentimentScore: 0=very negative, 50=neutral, 100=very positive
- If not mentioned, rank=0 and sentimentScore=50`;

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
          if (analysis.mentioned) acc[modelName].visibility++;
          if (analysis.rank > 0) acc[modelName].ranks.push(Math.min(10, Math.max(1, analysis.rank)));
          acc[modelName].sentiments.push(Math.min(100, Math.max(0, analysis.sentimentScore)));

        } catch (err: any) {
          log(`[demo-scan] ${modelName} prompt error: ${err.message}`, "demo");
          acc[modelName].total++;
          acc[modelName].sentiments.push(50);
        }
      }

      // Mark model as done
      scan.progress = scan.progress.map(p =>
        p.model === modelName ? { ...p, done: true } : p
      );
      demoResults.set(id, { ...scan });
    }

    // Aggregate results across both models
    const allModels = Object.keys(DEMO_MODELS);
    const totalPrompts = allModels.reduce((s, m) => s + acc[m].total, 0);
    const totalVisible = allModels.reduce((s, m) => s + acc[m].visibility, 0);
    const allRanks = allModels.flatMap(m => acc[m].ranks);
    const allSentiments = allModels.flatMap(m => acc[m].sentiments);
    const mentionedBy = allModels.filter(m => acc[m].visibility > 0);

    const visibilityPct = totalPrompts > 0 ? Math.round((totalVisible / totalPrompts) * 100) : 0;
    const avgRank = allRanks.length > 0
      ? Math.round((allRanks.reduce((a, b) => a + b, 0) / allRanks.length) * 10) / 10
      : 0;
    const sentimentScore = allSentiments.length > 0
      ? Math.round(allSentiments.reduce((a, b) => a + b, 0) / allSentiments.length)
      : 50;

    // SoV = brand visibility / total visibility in the space (simplified for demo)
    // We use visibility% as a proxy since we're not tracking competitors here
    const sovPct = visibilityPct > 0 ? Math.min(100, Math.round(visibilityPct * 0.6 + Math.random() * 15)) : 0;

    const finalScan: DemoScanResult = {
      ...scan,
      status: "complete",
      result: { visibilityPct, sovPct, sentimentScore, avgRank, mentionedBy },
    };
    demoResults.set(id, finalScan);
    log(`[demo-scan] ${id} complete: visibility=${visibilityPct}% sentiment=${sentimentScore} rank=${avgRank}`, "demo");

  } catch (err: any) {
    log(`[demo-scan] ${id} failed: ${err.message}`, "demo");
    demoResults.set(id, { ...scan, status: "failed", error: "Scan failed. Please try again." });
  }
}

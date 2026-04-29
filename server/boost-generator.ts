import { storage } from "./storage";
import { callOpenRouterJSON } from "./openrouter";
import type { DailyMetric, Competitor, Citation } from "@shared/schema";

const MODEL = "anthropic/claude-sonnet-4-5";

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildContext(
  brandName: string,
  metrics: DailyMetric[],
  competitors: Competitor[],
  citations: Citation[]
): string {
  // Get all unique dates sorted
  const allDates = Array.from(new Set(metrics.map((m) => m.date))).sort();
  const latestDate = allDates[allDates.length - 1];
  const prevDate = allDates[Math.max(0, allDates.length - 8)];

  // Brand metrics at latest date
  const brandLatest = metrics.filter((m) => m.brandName === brandName && m.date === latestDate);
  const brandPrev = metrics.filter((m) => m.brandName === brandName && m.date === prevDate);

  const brandStats = {
    visibility: avg(brandLatest.map((m) => m.visibilityPct || 0)),
    visibilityPrev: avg(brandPrev.map((m) => m.visibilityPct || 0)),
    sov: avg(brandLatest.map((m) => m.sovPct || 0)),
    sovPrev: avg(brandPrev.map((m) => m.sovPct || 0)),
    rank: avg(brandLatest.map((m) => m.avgRank || 0)),
    rankPrev: avg(brandPrev.map((m) => m.avgRank || 0)),
    sentiment: avg(brandLatest.map((m) => m.sentimentScore || 0)),
    sentimentPrev: avg(brandPrev.map((m) => m.sentimentScore || 0)),
    brandStrength: avg(brandLatest.map((m) => m.brandStrength || 0)),
    brandStrengthPrev: avg(brandPrev.map((m) => m.brandStrength || 0)),
  };

  // Per-model breakdown for brand
  const modelBreakdown = brandLatest.map((m) => ({
    model: m.model,
    visibility: (m.visibilityPct || 0).toFixed(1),
    sov: (m.sovPct || 0).toFixed(1),
    rank: (m.avgRank || 0).toFixed(1),
    sentiment: (m.sentimentScore || 0).toFixed(0),
  }));

  // Competitor comparison at latest date
  const competitorNames = competitors.map((c) => c.brandName);
  const competitorStats = competitorNames.map((name) => {
    const compLatest = metrics.filter((m) => m.brandName === name && m.date === latestDate);
    return {
      name,
      visibility: avg(compLatest.map((m) => m.visibilityPct || 0)).toFixed(1),
      sov: avg(compLatest.map((m) => m.sovPct || 0)).toFixed(1),
      rank: avg(compLatest.map((m) => m.avgRank || 0)).toFixed(1),
      brandStrength: avg(compLatest.map((m) => m.brandStrength || 0)).toFixed(0),
    };
  });

  // Top cited external domains (not owned)
  const externalCitations = citations
    .filter((c) => !c.isOwned)
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, 10);

  // Owned pages being cited
  const ownedCitations = citations
    .filter((c) => c.isOwned)
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, 5);

  // Trend over last 4 data points
  const last4Dates = allDates.slice(-4);
  const trendData = last4Dates.map((date) => {
    const dayMetrics = metrics.filter((m) => m.brandName === brandName && m.date === date);
    return {
      date,
      visibility: avg(dayMetrics.map((m) => m.visibilityPct || 0)).toFixed(1),
      sov: avg(dayMetrics.map((m) => m.sovPct || 0)).toFixed(1),
      brandStrength: avg(dayMetrics.map((m) => m.brandStrength || 0)).toFixed(0),
    };
  });

  return `
BRAND: ${brandName}
SCAN DATE: ${latestDate || "N/A"}
DATA POINTS: ${allDates.length} scan dates over the past 30 days

## CURRENT BRAND PERFORMANCE
- AI Visibility: ${brandStats.visibility.toFixed(1)}% (prev: ${brandStats.visibilityPrev.toFixed(1)}%, change: ${(brandStats.visibility - brandStats.visibilityPrev).toFixed(1)}%)
- Share of Voice: ${brandStats.sov.toFixed(1)}% (prev: ${brandStats.sovPrev.toFixed(1)}%, change: ${(brandStats.sov - brandStats.sovPrev).toFixed(1)}%)
- Avg Ranking: #${brandStats.rank.toFixed(1)} (prev: #${brandStats.rankPrev.toFixed(1)}, lower is better)
- Sentiment Score: ${brandStats.sentiment.toFixed(0)}/100 (prev: ${brandStats.sentimentPrev.toFixed(0)})
- Brand Strength: ${brandStats.brandStrength.toFixed(0)}/100 (prev: ${brandStats.brandStrengthPrev.toFixed(0)})

## PER-MODEL BREAKDOWN
${modelBreakdown.map((m) => `- ${m.model}: visibility ${m.visibility}%, SoV ${m.sov}%, rank #${m.rank}, sentiment ${m.sentiment}`).join("\n") || "No model data available"}

## COMPETITOR COMPARISON
${competitorStats.length > 0 ? competitorStats.map((c) => `- ${c.name}: visibility ${c.visibility}%, SoV ${c.sov}%, rank #${c.rank}, brand strength ${c.brandStrength}`).join("\n") : "No competitors tracked"}

## TREND (last 4 scans)
${trendData.map((t) => `- ${t.date}: visibility ${t.visibility}%, SoV ${t.sov}%, brand strength ${t.brandStrength}`).join("\n") || "Insufficient trend data"}

## TOP EXTERNAL SOURCES (AI models cite these when discussing the industry)
${externalCitations.length > 0 ? externalCitations.map((c) => `- ${c.domain} (${c.citationCount} citations)`).join("\n") : "No citation data yet"}

## YOUR OWNED PAGES BEING CITED
${ownedCitations.length > 0 ? ownedCitations.map((c) => `- ${c.pageTitle || c.url} (${c.citationCount} citations)`).join("\n") : "No owned citation data yet"}
`.trim();
}

export interface GeneratedAction {
  title: string;
  description: string;
  category: string;
  priority: string;
  effort: string;
}

export async function generateBoostActions(projectId: string): Promise<GeneratedAction[]> {
  const [project, metrics, competitors, citations] = await Promise.all([
    storage.getProject(projectId),
    storage.getDailyMetrics(projectId, 30),
    storage.getCompetitors(projectId),
    storage.getCitations(projectId),
  ]);

  if (!project) throw new Error("Project not found");

  const hasData = metrics.length > 0;
  const context = hasData
    ? buildContext(project.brandName, metrics, competitors, citations)
    : `BRAND: ${project.brandName}\nDomain: ${project.domain}\nIndustry: ${project.industry || "Not specified"}\nNO SCAN DATA YET — generate general AI visibility best practices for this brand.`;

  const systemPrompt = `You are an AI search visibility strategist. Your job is to analyze brand performance data from AI model queries (ChatGPT, Claude, Gemini, Grok) and generate specific, actionable recommendations to improve the brand's visibility and representation in AI-generated responses.

Focus on:
- Content gaps that competitors are filling
- Specific AI models where the brand underperforms
- Citation opportunities (getting the brand's pages cited by AI models)
- Sentiment improvement tactics
- Share of Voice growth strategies
- Technical and content actions with clear expected impact

Be specific and tactical — not generic. Reference actual numbers from the data when relevant.`;

  const userPrompt = `Based on this AI search visibility data, generate exactly 7 boost actions for ${project.brandName}:

${context}

Return a JSON array of exactly 7 objects. Each object must have these exact fields:
- title: string (max 60 chars, action-oriented, starts with a verb)
- description: string (2-3 sentences, specific and tactical, references actual data points where relevant)
- category: one of exactly: "content", "technical", "pr_outreach", "competitor_gap", "citations", "sentiment"
- priority: one of exactly: "high", "medium", "low"
- effort: one of exactly: "low", "medium", "high"

Order by priority descending (high first). Return ONLY the JSON array, no other text.`;

  const actions = await callOpenRouterJSON<GeneratedAction[]>(
    MODEL,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 2000, temperature: 0.7 }
  );

  // Validate structure
  const validCategories = ["content", "technical", "pr_outreach", "competitor_gap", "citations", "sentiment"];
  const validPriorities = ["high", "medium", "low"];
  const validEfforts = ["low", "medium", "high"];

  return actions.map((a) => ({
    title: String(a.title || "").slice(0, 120),
    description: String(a.description || ""),
    category: validCategories.includes(a.category) ? a.category : "content",
    priority: validPriorities.includes(a.priority) ? a.priority : "medium",
    effort: validEfforts.includes(a.effort) ? a.effort : "medium",
  }));
}

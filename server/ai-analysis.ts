import { storage } from "./storage";
import { log } from "./index";
import { emitScanEvent } from "./scan-events";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

// Fast, cheap model used for JSON extraction analysis
const EXTRACTION_MODEL = "openai/gpt-4o-mini";

const MODEL_MAP: Record<string, string> = {
  "ChatGPT": "openai/gpt-4o",
  "Claude": "anthropic/claude-sonnet-4-5",
  "Google Gemini": "google/gemini-2.5-pro",
  "Grok": "x-ai/grok-3",
};

interface BrandAnalysis {
  brandName: string;
  mentioned: boolean;
  rank: number;
  sentimentScore: number;
  citedUrls: string[];
}

interface PromptAnalysisResult {
  brands: BrandAnalysis[];
  allCitedUrls: { url: string; title: string }[];
}

async function callOpenRouter(
  modelId: string,
  messages: { role: string; content: string }[],
  maxTokens = 2048
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const res = await fetch(OPENROUTER_BASE, {
    signal: controller.signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.APP_URL || "https://ai-search-visibility.vercel.app",
      "X-Title": "AI Search Visibility",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${modelId} error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function analyzeResponse(
  promptText: string,
  aiResponse: string,
  ourBrand: string,
  competitorNames: string[]
): Promise<PromptAnalysisResult> {
  const allBrands = [ourBrand, ...competitorNames];

  const extractionPrompt = `You are a brand-mention analysis engine. Given an AI-generated response to a user query, extract structured data about brand mentions.

USER QUERY: "${promptText}"

AI RESPONSE:
"""
${aiResponse}
"""

BRANDS TO TRACK: ${allBrands.join(", ")}

Analyze the response and return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "brands": [
    {
      "brandName": "BrandX",
      "mentioned": true,
      "rank": 1,
      "sentimentScore": 75,
      "citedUrls": []
    }
  ],
  "allCitedUrls": [
    { "url": "https://example.com", "title": "Page title" }
  ]
}

Rules:
- "mentioned": true if the brand appears anywhere in the response
- "rank": position in the response (1=first mentioned/recommended, 0=not mentioned)
- "sentimentScore": 0-100 (0=very negative, 50=neutral, 100=very positive). Base this on how favorably the brand is discussed.
- "citedUrls": any URLs specifically associated with this brand
- "allCitedUrls": all URLs/sources cited in the entire response
- Include ALL tracked brands, even if not mentioned (mentioned=false, rank=0, sentimentScore=50)`;

  try {
    const raw = await callOpenRouter(EXTRACTION_MODEL, [
      { role: "user", content: extractionPrompt },
    ], 1500);

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed as PromptAnalysisResult;
  } catch (err: any) {
    log(`Analysis extraction failed: ${err.message}`, "ai-analysis");
    return {
      brands: allBrands.map((b) => ({
        brandName: b,
        mentioned: false,
        rank: 0,
        sentimentScore: 50,
        citedUrls: [],
      })),
      allCitedUrls: [],
    };
  }
}

export async function runAnalysis(projectId: string, existingRunId?: number): Promise<number> {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error("Project not found");

  const activePrompts = (await storage.getPrompts(projectId)).filter((p) => p.isActive);
  if (activePrompts.length === 0) throw new Error("No active prompts to analyze");

  const competitors = await storage.getCompetitors(projectId);
  const competitorNames = competitors.map((c) => c.brandName);
  const models = Object.keys(MODEL_MAP);

  let run;
  if (existingRunId) {
    const existing = await storage.getAnalysisRun(existingRunId);
    if (!existing) throw new Error("Analysis run not found");
    run = existing;
  } else {
    run = await storage.createAnalysisRun({
      projectId,
      status: "running",
      totalPrompts: activePrompts.length * models.length,
      completedPrompts: 0,
      modelsUsed: models,
    });
  }

  const total = activePrompts.length * models.length;

  // Emit start event
  emitScanEvent(run.id, {
    type: "start",
    runId: run.id,
    totalPrompts: activePrompts.length,
    totalModels: models.length,
    models,
  });

  const today = new Date().toISOString().split("T")[0];
  let completed = 0;

  const brandMetrics = new Map<
    string,
    Map<string, { visibility: number; total: number; ranks: number[]; sentiments: number[] }>
  >();

  try {
    for (const prompt of activePrompts) {
      for (const [displayName, modelId] of Object.entries(MODEL_MAP)) {
        // Emit "running" event before calling the model
        emitScanEvent(run.id, {
          type: "progress",
          runId: run.id,
          completed,
          total,
          model: displayName,
          promptText: prompt.text.slice(0, 80),
          status: "running",
        });

        try {
          log(`Querying ${displayName} for prompt: "${prompt.text.slice(0, 60)}..."`, "ai-analysis");

          const aiResponse = await callOpenRouter(modelId, [
            { role: "user", content: prompt.text },
          ]);

          const analysis = await analyzeResponse(
            prompt.text,
            aiResponse,
            project.brandName,
            competitorNames
          );

          for (const brand of analysis.brands) {
            if (!brandMetrics.has(brand.brandName)) {
              brandMetrics.set(brand.brandName, new Map());
            }
            const modelMap = brandMetrics.get(brand.brandName)!;
            if (!modelMap.has(displayName)) {
              modelMap.set(displayName, { visibility: 0, total: 0, ranks: [], sentiments: [] });
            }
            const m = modelMap.get(displayName)!;
            m.total++;
            if (brand.mentioned) m.visibility++;
            if (brand.rank > 0) m.ranks.push(brand.rank);
            m.sentiments.push(brand.sentimentScore);
          }

          for (const cite of analysis.allCitedUrls) {
            if (cite.url && cite.url.startsWith("http")) {
              try {
                const urlDomain = new URL(cite.url).hostname.replace("www.", "");
                const isOwned = urlDomain === project.domain || urlDomain.endsWith(`.${project.domain}`);
                await storage.upsertCitation({
                  projectId,
                  url: cite.url,
                  domain: urlDomain,
                  pageTitle: cite.title || null,
                  citationCount: 1,
                  isOwned: isOwned,
                  weekChange: 0,
                });
              } catch {}
            }
          }

          completed++;
          await storage.updateAnalysisRun(run.id, { completedPrompts: completed });

          // Emit "done" event after successful model call
          emitScanEvent(run.id, {
            type: "progress",
            runId: run.id,
            completed,
            total,
            model: displayName,
            promptText: prompt.text.slice(0, 80),
            status: "done",
          });
        } catch (err: any) {
          log(`Error with ${displayName} on prompt ${prompt.id}: ${err.message}`, "ai-analysis");
          completed++;
          await storage.updateAnalysisRun(run.id, { completedPrompts: completed });

          // Emit "error" event on failure
          emitScanEvent(run.id, {
            type: "progress",
            runId: run.id,
            completed,
            total,
            model: displayName,
            promptText: prompt.text.slice(0, 80),
            status: "error",
          });
        }
      }
    }

    const brandEntries = Array.from(brandMetrics.entries());
    for (const [brandName, modelMap] of brandEntries) {
      const modelEntries = Array.from(modelMap.entries());
      for (const [model, data] of modelEntries) {
        const visibilityPct = data.total > 0 ? (data.visibility / data.total) * 100 : 0;
        const avgRank = data.ranks.length > 0 ? data.ranks.reduce((a: number, b: number) => a + b, 0) / data.ranks.length : 0;
        const sentimentScore = data.sentiments.length > 0 ? data.sentiments.reduce((a: number, b: number) => a + b, 0) / data.sentiments.length : 50;

        const allBrandsForModel: string[] = [];
        for (const [bn, mm] of brandEntries) {
          const md = mm.get(model);
          if (md && md.visibility > 0) allBrandsForModel.push(bn);
        }
        const sovPct = allBrandsForModel.length > 0
          ? (data.visibility / allBrandsForModel.reduce((sum: number, bn: string) => {
              const md = brandMetrics.get(bn)?.get(model);
              return sum + (md?.visibility || 0);
            }, 0)) * 100
          : 0;

        const brandStrength = Math.round(
          visibilityPct * 0.3 + sovPct * 0.25 + (avgRank > 0 ? Math.max(0, 100 - (avgRank - 1) * 15) : 0) * 0.25 + sentimentScore * 0.2
        );

        await storage.createDailyMetric({
          projectId,
          brandName,
          model,
          date: today,
          visibilityPct: Math.round(visibilityPct * 10) / 10,
          sovPct: Math.round(sovPct * 10) / 10,
          avgRank: Math.round(avgRank * 10) / 10,
          sentimentScore: Math.round(sentimentScore * 10) / 10,
          brandStrength: Math.min(100, Math.max(0, brandStrength)),
        });
      }
    }

    await storage.updateAnalysisRun(run.id, {
      status: "completed",
      completedPrompts: completed,
      completedAt: new Date(),
    });

    emitScanEvent(run.id, {
      type: "complete",
      runId: run.id,
      completedPrompts: completed,
    });

    log(`Analysis run ${run.id} completed: ${completed} prompt-model combinations processed`, "ai-analysis");
    return run.id;
  } catch (err: any) {
    await storage.updateAnalysisRun(run.id, {
      status: "failed",
      error: err.message,
      completedAt: new Date(),
    });

    emitScanEvent(run.id, {
      type: "failed",
      runId: run.id,
      error: err.message,
    });

    throw err;
  }
}

/**
 * Site Intelligence — crawls a domain with Firecrawl and generates
 * brand-specific AI search prompts using GPT-4o-mini.
 *
 * Used by:
 *  - demo-scan.ts  (landing page real scan)
 *  - routes.ts     (project wizard prompt suggestions)
 */

import { callOpenRouterJSON } from "./openrouter";
import { log } from "./index";

const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY!;

export interface SiteContext {
  summary: string;        // 2-3 sentence description of what the business does
  location: string;       // city/region if local business, empty if national/global
  category: string;       // e.g. "luxury apartment rentals", "SaaS CRM tool"
  targetCustomer: string; // who their customers are
  keyOfferings: string[]; // main products/services (max 4)
}

export interface GeneratedPrompts {
  prompts: string[];
  siteContext: SiteContext;
}

/**
 * Scrape the homepage and extract meaningful content.
 * Returns truncated markdown suitable for prompt generation.
 */
async function crawlSite(domain: string): Promise<string> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${cleanDomain}`;

  const res = await fetch(FIRECRAWL_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FIRECRAWL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firecrawl error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(`Firecrawl failed: ${data.error || "unknown"}`);

  const markdown = data.data?.markdown || "";
  // Truncate to 3000 chars — enough for context, not too expensive for GPT
  return markdown.slice(0, 3000);
}

/**
 * From raw site content, extract structured business context.
 */
async function extractContext(
  brandName: string,
  domain: string,
  siteContent: string
): Promise<SiteContext> {
  const prompt = `You are a business analyst. Given this website content, extract structured information about the business.

BRAND: ${brandName}
DOMAIN: ${domain}
WEBSITE CONTENT:
"""
${siteContent}
"""

Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "2-3 sentence description of what this business does and who it serves",
  "location": "city and state/country if this is a local business, empty string if national or global",
  "category": "specific category e.g. luxury apartment rentals, SaaS project management tool, dental practice",
  "targetCustomer": "who their typical customer is e.g. young professionals, enterprise marketing teams, families",
  "keyOfferings": ["main offering 1", "main offering 2", "main offering 3"]
}

Rules:
- Be specific and accurate — use actual details from the content
- keyOfferings: max 4 items, each under 8 words
- If you cannot determine something from the content, use a reasonable inference`;

  return callOpenRouterJSON<SiteContext>(
    "openai/gpt-4o-mini",
    [{ role: "user", content: prompt }],
    { maxTokens: 400, temperature: 0 }
  );
}

/**
 * Generate prompts that reflect how real customers search for this type of business.
 * These are the queries we'll run against AI models to check brand visibility.
 */
async function generatePrompts(
  brandName: string,
  context: SiteContext,
  count: number
): Promise<string[]> {
  const locationClause = context.location
    ? ` in ${context.location}`
    : "";

  const prompt = `You are an SEO and AI search expert. Generate ${count} realistic search prompts that a potential customer would ask an AI assistant (like ChatGPT or Google) when looking for a business like "${brandName}".

BUSINESS CONTEXT:
- Category: ${context.category}
- Location: ${context.location || "Not location-specific"}
- Target customer: ${context.targetCustomer}
- Key offerings: ${context.keyOfferings.join(", ")}
- Summary: ${context.summary}

Generate exactly ${count} prompts. Rules:
- Each prompt should be a natural question a real customer would ask
- Mix intent types: informational ("what are..."), consideration ("best options for..."), transactional ("where can I find...")
- Include location${locationClause ? ` (use "${context.location}")` : " if relevant"} where natural
- Do NOT mention "${brandName}" in the prompts — these test whether AI discovers the brand unprompted
- Each prompt should be 8-20 words
- Prompts should be distinct — no duplicates or near-duplicates

Return ONLY valid JSON (no markdown):
{ "prompts": ["prompt 1", "prompt 2", ...] }`;

  const result = await callOpenRouterJSON<{ prompts: string[] }>(
    "openai/gpt-4o-mini",
    [{ role: "user", content: prompt }],
    { maxTokens: 600, temperature: 0.4 }
  );

  return Array.isArray(result?.prompts)
    ? result.prompts
        .map((p: string) => String(p).trim())
        .filter((p: string) => p.length > 10 && p.length < 200)
        .slice(0, count)
    : [];
}

/**
 * Main entry point — crawl a site and return brand-specific prompts.
 * @param domain  e.g. "cynthiagardens.com"
 * @param brandName  e.g. "Cynthia Gardens"
 * @param count  number of prompts to generate (2 for demo, 5 for wizard)
 */
export async function getSitePrompts(
  domain: string,
  brandName: string,
  count = 5
): Promise<GeneratedPrompts> {
  log(`[site-intelligence] crawling ${domain}`, "firecrawl");

  const siteContent = await crawlSite(domain);
  log(`[site-intelligence] got ${siteContent.length} chars from ${domain}`, "firecrawl");

  const siteContext = await extractContext(brandName, domain, siteContent);
  log(`[site-intelligence] context: ${siteContext.category} | ${siteContext.location}`, "firecrawl");

  const prompts = await generatePrompts(brandName, siteContext, count);
  log(`[site-intelligence] generated ${prompts.length} prompts for ${brandName}`, "firecrawl");

  return { prompts, siteContext };
}

/**
 * Lightweight version — just generate fallback prompts from brand name + industry
 * when Firecrawl is unavailable or times out.
 */
export async function getFallbackPrompts(
  brandName: string,
  industry: string,
  count = 2
): Promise<string[]> {
  const prompt = `Generate ${count} realistic AI search prompts a customer would ask when looking for a ${industry} company.
Do NOT mention "${brandName}" in the prompts.
Return ONLY JSON: { "prompts": ["prompt 1", "prompt 2"] }`;

  try {
    const result = await callOpenRouterJSON<{ prompts: string[] }>(
      "openai/gpt-4o-mini",
      [{ role: "user", content: prompt }],
      { maxTokens: 200, temperature: 0.4 }
    );
    return result?.prompts?.slice(0, count) ?? [];
  } catch {
    return [
      `What are the best ${industry} companies available?`,
      `I'm looking for ${industry} options — what do you recommend?`,
    ];
  }
}

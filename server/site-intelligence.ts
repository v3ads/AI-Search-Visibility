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
  summary: string;
  location: string;
  neighborhood: string;        // specific neighborhood/area if known
  category: string;
  subcategory: string;         // more specific niche
  targetCustomer: string;
  keyOfferings: string[];
  uniqueAttributes: string[];  // what makes this brand distinct
  searchTriggers: string[];    // life events / situations that lead to this brand
}

export interface GeneratedPrompts {
  prompts: string[];
  siteContext: SiteContext;
}

// ── Crawl ────────────────────────────────────────────────────────────────────

/**
 * Crawl a URL and return markdown content.
 * Tries the path given; caller is responsible for which pages to fetch.
 */
async function crawlUrl(url: string, timeoutMs = 12000): Promise<string> {
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
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`Firecrawl ${res.status} for ${url}`);
  const data = await res.json();
  if (!data.success) throw new Error(`Firecrawl failed for ${url}: ${data.error}`);
  return (data.data?.markdown || "").slice(0, 2500);
}

/**
 * Crawl homepage + up to 3 key subpages in parallel.
 * Subpages tried: /about, /amenities, /services, /units, /apartments,
 * /what-we-do, /features — whichever resolve.
 */
async function crawlSite(domain: string): Promise<string> {
  const base = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  const SUBPAGES = ["/about", "/amenities", "/services", "/features", "/apartments", "/units", "/what-we-do"];

  // Fetch homepage + subpages concurrently, ignore individual failures
  const results = await Promise.allSettled([
    crawlUrl(base),
    ...SUBPAGES.map(path => crawlUrl(`${base}${path}`, 8000)),
  ]);

  const pages = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled" && r.value.length > 100)
    .map(r => r.value);

  log(`[site-intelligence] crawled ${pages.length} pages from ${domain}`, "firecrawl");

  // Combine, deduplicate noise, truncate total to ~5000 chars
  return pages.join("\n\n---\n\n").slice(0, 5000);
}

// ── Context Extraction ────────────────────────────────────────────────────────

async function extractContext(
  brandName: string,
  domain: string,
  siteContent: string
): Promise<SiteContext> {
  const prompt = `You are a brand analyst. Extract detailed structured information about this business from its website content.

BRAND: ${brandName}
DOMAIN: ${domain}
WEBSITE CONTENT:
"""
${siteContent}
"""

Return ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence description of what this business does and who it serves",
  "location": "city and state if local business, empty if national/global",
  "neighborhood": "specific neighborhood, district, or area if mentioned, otherwise empty",
  "category": "primary category e.g. luxury apartment community, B2B SaaS, dental practice",
  "subcategory": "more specific niche e.g. 'pet-friendly luxury apartments', 'AI-powered SEO tool', 'cosmetic dentistry'",
  "targetCustomer": "specific description of who their ideal customer is",
  "keyOfferings": ["offering 1", "offering 2", "offering 3"],
  "uniqueAttributes": ["what makes this brand distinct from competitors — specific amenities, features, values, awards"],
  "searchTriggers": ["life events or situations that lead someone to need this — e.g. 'relocating to the city', 'growing startup needs CRM', 'tooth pain'"]
}

Rules:
- Be very specific — use actual details from the content, not generic descriptions
- uniqueAttributes: things this brand actually has/does that competitors may not
- searchTriggers: think like the customer, not the business
- keyOfferings: max 4 items, specific not generic`;

  return callOpenRouterJSON<SiteContext>(
    "openai/gpt-4o-mini",
    [{ role: "user", content: prompt }],
    { maxTokens: 600, temperature: 0 }
  );
}

// ── Prompt Generation ─────────────────────────────────────────────────────────

const INTENT_INSTRUCTIONS: Record<string, string> = {
  informational: "General discovery questions — someone learning about options in this category without knowing the brand yet",
  consideration:  "Comparison and evaluation questions — someone actively comparing options before deciding",
  transactional:  "Ready-to-act questions — someone looking to sign up, book, visit, or purchase now",
  local:          "Location-specific questions — someone asking about options in a specific area, neighborhood, or city",
  lifestyle:      "Lifestyle and fit questions — someone asking about what life/work is like using this type of product/service",
};

async function generatePrompts(
  brandName: string,
  context: SiteContext,
  count: number
): Promise<string[]> {
  const locationContext = [context.neighborhood, context.location].filter(Boolean).join(", ");

  // Pick which intents to cover based on count
  const intents = Object.keys(INTENT_INSTRUCTIONS).slice(0, Math.max(count, 5));

  const prompt = `You are an AI search visibility expert. Generate ${count} realistic search prompts that a potential customer would ask an AI assistant (like ChatGPT or Google) when looking for something like "${brandName}".

BUSINESS CONTEXT:
- Category: ${context.category}
- Subcategory: ${context.subcategory}
- Location: ${locationContext || "Not location-specific"}
- Target customer: ${context.targetCustomer}
- Key offerings: ${context.keyOfferings.join(", ")}
- Unique attributes: ${context.uniqueAttributes.join(", ")}
- Search triggers (situations that lead to this brand): ${context.searchTriggers.join(", ")}

Generate exactly ${count} prompts covering these intent types:
${intents.map((intent, i) => `${i + 1}. ${intent.toUpperCase()}: ${INTENT_INSTRUCTIONS[intent]}`).join("\n")}

Critical rules:
- Do NOT mention "${brandName}" anywhere in the prompts — we're testing if AI discovers it unprompted
- Use specific location details (${locationContext || "if relevant"}) where natural — not just the city but also neighborhood if known
- Each prompt should reflect a DIFFERENT reason someone might find this brand — vary the angle completely
- Think like real customers at different stages of their journey
- 8–25 words per prompt
- No duplicates or near-duplicates

Return ONLY valid JSON:
{ "prompts": ["prompt 1", "prompt 2", ...] }`;

  const result = await callOpenRouterJSON<{ prompts: string[] }>(
    "openai/gpt-4o-mini",
    [{ role: "user", content: prompt }],
    { maxTokens: 800, temperature: 0.5 }
  );

  const raw = Array.isArray(result?.prompts) ? result.prompts : [];

  // Filter and sanitize
  return raw
    .map((p: string) => String(p).trim())
    .filter((p: string) => p.length > 10 && p.length < 250 && !p.toLowerCase().includes(brandName.toLowerCase()))
    .slice(0, count);
}

// ── Brand Awareness Probe ─────────────────────────────────────────────────────

/**
 * Always included as prompt #1 in full scans (not demo).
 * Tests if AI has direct knowledge of the brand.
 */
export function getBrandAwarenessProbe(brandName: string, location: string): string {
  return location
    ? `What can you tell me about ${brandName} in ${location}?`
    : `What can you tell me about ${brandName}?`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Main entry — crawl site and return brand-specific prompts across multiple intents.
 * @param domain   e.g. "cynthiagardens.com"
 * @param brandName e.g. "Cynthia Gardens"
 * @param count    number of prompts to generate (2 for demo, 5 for wizard)
 * @param includeProbe  prepend a brand awareness probe as prompt #1 (full scans only)
 */
export async function getSitePrompts(
  domain: string,
  brandName: string,
  count = 5,
  includeProbe = false
): Promise<GeneratedPrompts> {
  log(`[site-intelligence] crawling ${domain} (${count} prompts, probe=${includeProbe})`, "firecrawl");

  const siteContent = await crawlSite(domain);
  log(`[site-intelligence] got ${siteContent.length} chars from ${domain}`, "firecrawl");

  const siteContext = await extractContext(brandName, domain, siteContent);
  log(`[site-intelligence] context: ${siteContext.subcategory} | ${siteContext.neighborhood ? siteContext.neighborhood + ", " : ""}${siteContext.location}`, "firecrawl");

  // For demo (count=2): generate 2 prompts across 2 different intents
  // For wizard (count=5): generate across all 5 intent types
  const promptCount = includeProbe ? count - 1 : count;
  const generated = await generatePrompts(brandName, siteContext, promptCount);

  const prompts = includeProbe
    ? [getBrandAwarenessProbe(brandName, [siteContext.neighborhood, siteContext.location].filter(Boolean).join(", ")), ...generated]
    : generated;

  log(`[site-intelligence] generated ${prompts.length} prompts for ${brandName}`, "firecrawl");

  return { prompts, siteContext };
}

/**
 * Competitor suggestions — uses full site context for accuracy.
 */
export async function getSiteCompetitors(
  domain: string,
  brandName: string,
  industry: string
): Promise<string[]> {
  let context: SiteContext | null = null;

  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const siteContent = await crawlSite(domain);
      context = await extractContext(brandName, domain, siteContent);
    } catch (err: any) {
      log(`[site-intelligence] Firecrawl failed for competitors: ${err.message}`, "firecrawl");
    }
  }

  const locationContext = context
    ? [context.neighborhood, context.location].filter(Boolean).join(", ")
    : "";

  const contextBlock = context
    ? `Business category: ${context.category}
Subcategory: ${context.subcategory}
Location: ${locationContext || "Not location-specific"}
Target customer: ${context.targetCustomer}
Key offerings: ${context.keyOfferings.join(", ")}
Unique attributes: ${context.uniqueAttributes.join(", ")}`
    : `Industry: ${industry}`;

  const prompt = `You are a competitive intelligence expert. Given a brand and its business context, return its 3 most direct competitors — companies its customers would also evaluate.

Brand: ${brandName}
Domain: ${domain}
${contextBlock}

Rules:
- Return ONLY real, established businesses that directly compete with this brand
- For local businesses, strongly prefer local or regional competitors over national ones
- Match the specificity: if this is a luxury apartment community, suggest other luxury apartment communities nearby — not Zillow or Apartments.com
- If genuinely unknown, return fewer or empty
- Brand/property names only — no domains, no descriptions
- Return exactly JSON: { "competitors": ["Name A", "Name B", "Name C"] }
- No markdown, no explanation, just the JSON`;

  try {
    const result = await callOpenRouterJSON<{ competitors: string[] }>(
      "openai/gpt-4o-mini",
      [{ role: "user", content: prompt }],
      { maxTokens: 200, temperature: 0 }
    );
    return Array.isArray(result?.competitors)
      ? result.competitors.map((c: any) => String(c).trim().slice(0, 80)).filter(Boolean).slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

/**
 * Fallback when Firecrawl is unavailable — generates generic prompts from brand + industry.
 */
export async function getFallbackPrompts(
  brandName: string,
  industry: string,
  count = 2
): Promise<string[]> {
  const prompt = `Generate ${count} realistic AI search prompts a customer would ask when looking for a ${industry} company.
Do NOT mention "${brandName}". Cover different intent types (informational, local, transactional).
Return ONLY JSON: { "prompts": ["prompt 1", "prompt 2"] }`;

  try {
    const result = await callOpenRouterJSON<{ prompts: string[] }>(
      "openai/gpt-4o-mini",
      [{ role: "user", content: prompt }],
      { maxTokens: 300, temperature: 0.4 }
    );
    return result?.prompts?.slice(0, count) ?? [];
  } catch {
    return [
      `What are the best ${industry} options available?`,
      `I'm looking for ${industry} recommendations — what do you suggest?`,
    ];
  }
}

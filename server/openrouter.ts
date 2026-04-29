/**
 * Unified OpenRouter client.
 * Used by both ai-analysis.ts and boost-generator.ts.
 * Single place to configure auth headers, timeouts, and error handling.
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 60_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  maxTokens?: number;
  temperature?: number;
}

export async function callOpenRouter(
  modelId: string,
  messages: ChatMessage[],
  options: OpenRouterOptions = {}
): Promise<string> {
  const { maxTokens = 2048, temperature = 0.7 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_BASE, {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.APP_URL || "https://plumboost.com",
        "X-Title": "PlumBoost",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `OpenRouter [${modelId}] ${res.status}: ${errText.slice(0, 200)}`
      );
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Convenience wrapper: calls the model and parses JSON from the response.
 * Strips markdown fences before parsing.
 */
export async function callOpenRouterJSON<T = unknown>(
  modelId: string,
  messages: ChatMessage[],
  options: OpenRouterOptions = {}
): Promise<T> {
  const raw = await callOpenRouter(modelId, messages, options);
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned) as T;
}

export const PROJECT_ID = "demo_project_001";

export const AI_MODELS = [
  "ChatGPT",
  "Claude",
  "Google Gemini",
  "Grok",
] as const;

export const INTENTS = [
  { value: "informational", label: "Informational" },
  { value: "consideration", label: "Consideration" },
  { value: "transactional", label: "Transactional" },
  { value: "branded", label: "Branded" },
  { value: "post_purchase", label: "Post-Purchase" },
] as const;

export const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-500/20 text-blue-400",
  consideration: "bg-amber-500/20 text-amber-400",
  transactional: "bg-green-500/20 text-green-400",
  branded: "bg-purple-500/20 text-purple-400",
  post_purchase: "bg-cyan-500/20 text-cyan-400",
};

export const MODEL_COLORS: Record<string, string> = {
  "ChatGPT": "#22c55e",
  "Claude": "#8b5cf6",
  "Google Gemini": "#f59e0b",
  "Grok": "#3b82f6",
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-green-500/20 text-green-400",
};

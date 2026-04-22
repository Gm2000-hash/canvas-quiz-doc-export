// Shared AI model resolver used by every generator edge function.
// Keeps a single source of truth for the default model and per-task tiers.

export const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export type ModelTier = "default" | "heavy" | "utility";

export interface AvailableModel {
  id: string;
  label: string;
  tier: ModelTier;
  description?: string;
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview", tier: "default", description: "Newest fast model — recommended default" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "default", description: "Balanced, proven reliable" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", tier: "utility", description: "Fastest & cheapest — utility tasks" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "heavy", description: "Best for long, complex content" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", tier: "heavy", description: "Newest reasoning model" },
  { id: "openai/gpt-5", label: "GPT-5", tier: "heavy", description: "OpenAI's strongest all-rounder" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", tier: "default", description: "OpenAI balanced option" },
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", tier: "utility", description: "OpenAI fast & cheap" },
  { id: "openai/gpt-5.2", label: "GPT-5.2", tier: "heavy", description: "OpenAI's latest reasoning model" },
];

export const ALLOWED_MODEL_IDS = new Set(AVAILABLE_MODELS.map((m) => m.id));

interface AiPreferencesShape {
  default_model?: string | null;
  overrides?: Partial<Record<ModelTier, string | null>>;
}

interface ResolveBody {
  model_override?: string | null;
  ai_preferences?: AiPreferencesShape | null;
}

/**
 * Resolve the model to use for an AI gateway call.
 * Order of precedence:
 *   1. Explicit per-request `model_override` from the client (validated against allow-list).
 *   2. Per-task preset from `body.ai_preferences.overrides[taskType]`.
 *   3. Global `body.ai_preferences.default_model`.
 *   4. `DEFAULT_MODEL`.
 */
export function resolveModel(
  body: ResolveBody | null | undefined,
  taskType: ModelTier = "default",
): string {
  const isAllowed = (id: unknown): id is string =>
    typeof id === "string" && ALLOWED_MODEL_IDS.has(id);

  if (body?.model_override && isAllowed(body.model_override)) {
    return body.model_override;
  }

  const prefs = body?.ai_preferences;
  const preset = prefs?.overrides?.[taskType];
  if (isAllowed(preset)) return preset;

  if (isAllowed(prefs?.default_model)) return prefs!.default_model as string;

  return DEFAULT_MODEL;
}

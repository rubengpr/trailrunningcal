export const OPENROUTER_SCRAPE_MODEL_IDS = [
  'openai/gpt-5.4-mini',
  'openai/gpt-5.4-nano',
  'minimax/minimax-m2.7',
  'deepseek/deepseek-v3.2',
  'mistralai/mistral-large-2512',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-small-2603',
  'qwen/qwen3.5-flash-02-23',
] as const;

export type OpenRouterScrapeModelId =
  (typeof OPENROUTER_SCRAPE_MODEL_IDS)[number];

export function isOpenRouterScrapeModelId(
  value: unknown,
): value is OpenRouterScrapeModelId {
  return (
    typeof value === 'string' &&
    (OPENROUTER_SCRAPE_MODEL_IDS as readonly string[]).includes(value)
  );
}

export const OPENROUTER_VISION_MODEL_IDS = [
  'openai/gpt-5.4-mini',
  'openai/gpt-5.4-nano',
  'mistralai/mistral-small-2603',
  'qwen/qwen3.5-flash-02-23',
] as const;

export type OpenRouterVisionModelId =
  (typeof OPENROUTER_VISION_MODEL_IDS)[number];

export function isOpenRouterVisionModelId(
  value: unknown,
): value is OpenRouterVisionModelId {
  return (
    typeof value === 'string' &&
    (OPENROUTER_VISION_MODEL_IDS as readonly string[]).includes(value)
  );
}

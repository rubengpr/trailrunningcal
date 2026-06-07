/**
 * Token usage from OpenRouter chat completions (OpenAI-compatible `usage` object).
 * `reasoningTokens` is null when the provider does not report reasoning breakdown.
 * `cost` is null when the provider does not report the charged amount.
 */
export interface OpenRouterScrapeUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens: number | null;
  cost: number | null;
}

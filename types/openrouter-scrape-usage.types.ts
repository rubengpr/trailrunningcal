/**
 * Token usage from OpenRouter chat completions (OpenAI-compatible `usage` object).
 * `reasoningTokens` is null when the provider does not report reasoning breakdown.
 */
export interface OpenRouterScrapeUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens: number | null;
}

/** Heuristic for UI: ~2.87 characters per token (not a real tokenizer). */
const CHARS_PER_TOKEN = 2.87;

export function estimateMarkdownTokensHeuristic(markdown: string): number {
  const trimmed = markdown.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return Math.round(trimmed.length / CHARS_PER_TOKEN);
}

/** Character count of trimmed markdown (same basis as token heuristic). */
export function markdownTrimmedCharCount(markdown: string): number {
  return markdown.trim().length;
}

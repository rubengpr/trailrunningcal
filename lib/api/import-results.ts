import type { ConflictingRace } from '@/types/race.types';

export type ConflictResult = { ok: false; conflicts: ConflictingRace[] };
type MarkdownRejectedReason = 'markdown_too_long' | 'markdown_too_short';

export type MarkdownRejectedResult = {
  ok: false;
  reason: MarkdownRejectedReason;
  markdown: string;
};

const MARKDOWN_REJECTED_REASONS = new Set<string>([
  'markdown_too_long',
  'markdown_too_short',
]);

export function parseMarkdownRejected(
  status: number,
  data: unknown,
): MarkdownRejectedResult | null {
  if (
    status === 422 &&
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    'markdown' in data &&
    MARKDOWN_REJECTED_REASONS.has((data as { error: string }).error)
  ) {
    const typed = data as { error: MarkdownRejectedReason; markdown: string };
    return {
      ok: false,
      reason: typed.error,
      markdown: typed.markdown ?? '',
    };
  }
  return null;
}

export function parseConflict(status: number, data: unknown): ConflictResult | null {
  if (
    status === 409 &&
    typeof data === 'object' &&
    data !== null &&
    'conflicts' in data
  ) {
    return {
      ok: false,
      conflicts: (data as { conflicts: ConflictingRace[] }).conflicts,
    };
  }
  return null;
}

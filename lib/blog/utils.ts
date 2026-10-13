import type { DraftSummary } from '@/types/blog-draft-record.types';

export const MIN_INSTRUCTION_LENGTH = 10;
export const MAX_INSTRUCTION_LENGTH = 5_000;

export function canDelete(draft: Pick<DraftSummary, 'status' | 'evaluationStatus'>): boolean {
  return (draft.status === 'completed' || draft.status === 'failed') &&
    ['not_evaluated', 'completed', 'failed'].includes(draft.evaluationStatus);
}

export function validateInstructions(value: string): 'tooShort' | 'tooLong' | null {
  const length = value.trim().length;
  if (length < MIN_INSTRUCTION_LENGTH) return 'tooShort';
  if (length > MAX_INSTRUCTION_LENGTH) return 'tooLong';
  return null;
}

import { start } from 'workflow/api';
import { createDraft, deleteDraft, getDraft, listDrafts, markFailed, setRunId } from '@/lib/db/blog-drafts';
import { articleWorkflow } from '@/lib/workflows/blog-article';
import { evaluationWorkflow } from '@/lib/workflows/blog-evaluation';
import { claim, fail } from '@/lib/db/blog-evaluations';
import { ValidationError } from '@/lib/errors';
import { canDelete, validateInstructions } from '@/lib/blog/utils';
import type { DraftDetail, DraftInput, DraftPage } from '@/types/blog-draft-record.types';

export function list(page: number): Promise<DraftPage> {
  return listDrafts(page);
}

export function get(id: string): Promise<DraftDetail | null> {
  return getDraft(id);
}

export async function remove(id: string): Promise<void> {
  const draft = await getDraft(id);
  if (!draft) throw new ValidationError('Blog draft not found', 404);
  if (!canDelete(draft)) throw new ValidationError('Blog draft is processing', 409);
  if (await deleteDraft(id)) return;
  if (!await getDraft(id)) throw new ValidationError('Blog draft not found', 404);
  throw new ValidationError('Blog draft is processing', 409);
}

export async function generate(input: DraftInput): Promise<DraftDetail> {
  const instructions = input.instructions.trim();
  const error = validateInstructions(instructions);
  if (error) {
    throw new ValidationError(error === 'tooShort' ? 'instructions_too_short' : 'instructions_too_long', 422);
  }
  const draft = await createDraft(instructions);
  let run;
  try {
    run = await start(articleWorkflow, [{ id: draft.id }]);
  } catch {
    await markFailed(draft.id, 'start_failed');
    throw new Error('Workflow start failed');
  }
  try { await setRunId(draft.id, run.runId); } catch {
    console.error('Blog workflow tracking failed', { draftId: draft.id, runId: run.runId });
  }
  return draft;
}

export async function evaluateDraft(id: string): Promise<DraftDetail | null> {
  const draft = await getDraft(id);
  if (!draft) return null;
  const attemptId = draft.status === 'completed' ? await claim(id) : null;
  if (!attemptId) {
    throw new ValidationError('Evaluation state conflict',409);
  }
  try { await start(evaluationWorkflow,[{id,attemptId}]); } catch {
    await fail(id,'start_failed',null,attemptId);
    throw new Error('Evaluation start failed');
  }
  return {...draft,evaluationStatus:'queued',evaluationErrorCode:null};
}

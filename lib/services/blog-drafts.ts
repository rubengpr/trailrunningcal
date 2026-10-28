import { cleanImages } from '@/lib/services/blog-publication';
import { track } from '@/lib/db/blog-research';
import { researchEvents } from '@/lib/db/blog-events';
import { isRegion } from '@/lib/blog/regions';
import es from '@/locales/es/translation.json';
import { researchModel } from '@/lib/integrations/openai/event-investigation';
import { start } from 'workflow/api';
import { createDraft, createGeneration, deleteDraft, getDraft, listDrafts, markFailed, setRunId } from '@/lib/db/blog-drafts';
import { articleWorkflow } from '@/lib/workflows/blog-article';
import { evaluationWorkflow } from '@/lib/workflows/blog-evaluation';
import { claim, fail } from '@/lib/db/blog-evaluations';
import { getCosts } from '@/lib/db/blog-costs';
import { ValidationError } from '@/lib/errors';
import { canDelete, validateInstructions } from '@/lib/blog/utils';
import type { DraftDetail, DraftListItem, DraftInput, DraftPage } from '@/types/blog-draft-record.types';

export function list(page: number): Promise<DraftPage> {
  return listDrafts(page);
}

async function withCosts(draft: DraftDetail): Promise<DraftDetail> {
  if (draft.status !== 'completed') return draft;
  // Cost reporting is auxiliary: a failed read never hides the article.
  try { return {...draft, costs: await getCosts(draft)}; } catch (error) {
    console.error('Blog cost read failed', {draftId: draft.id, error});
    return {...draft, costs: null};
  }
}

export async function get(id: string): Promise<DraftDetail | null> {
  const draft = await getDraft(id);
  return draft ? withCosts(draft) : null;
}

export async function remove(id: string): Promise<void> {
  const draft = await getDraft(id);
  if (!draft) throw new ValidationError('Blog draft not found', 404);
  if (!canDelete(draft)) throw new ValidationError('Blog draft is processing', 409);
  if (await deleteDraft(id)) { await cleanImages(id); return; }
  if (!await getDraft(id)) throw new ValidationError('Blog draft not found', 404);
  throw new ValidationError('Blog draft is processing', 409);
}

export async function generate(input: DraftInput): Promise<DraftListItem> {
  let draft:DraftDetail;
  if ('regionId' in input) {
    if (!isRegion(input.regionId) || input.eventIds.length !== 5 || new Set(input.eventIds).size !== 5) throw new ValidationError('Invalid selection',422);
    const events = await researchEvents(input.regionId,input.eventIds);
    if (events.length !== 5 || events.some(event => !event.name.trim())) throw new ValidationError('Invalid selection',422);
    const instructions = `Selección editorial de cinco eventos de trail running en ${es.geography.regions[input.regionId]}.`;
    draft = await createGeneration(input.regionId,events,researchModel,instructions);
  } else {
    const instructions = input.instructions.trim();
    const error = validateInstructions(instructions);
    if (error) throw new ValidationError(error === 'tooShort' ? 'instructions_too_short' : 'instructions_too_long',422);
    draft = await createDraft(instructions);
  }
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
  if (draft.generationResearchId) {
    try { await track(draft.generationResearchId,run.runId); } catch {
      console.error('Blog research tracking failed',{draftId:draft.id,researchId:draft.generationResearchId,runId:run.runId});
    }
  }
  return {id:draft.id,status:'queued',stage:'queued',progress:null,takingLong:false};
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
  return withCosts({...draft,evaluationStatus:'queued',evaluationErrorCode:null});
}

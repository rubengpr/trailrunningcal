import { researchEvents } from '@/lib/db/blog-events';
import { isRegion } from '@/lib/blog/regions';
import type { SelectionInput } from '@/types/blog-selection.types';
import { start } from 'workflow/api';
import { getDraft } from '@/lib/db/blog-drafts';
import { claim, createRun, fail, getRun, listRuns, track } from '@/lib/db/blog-research';
import { investigateEvent, researchModel } from '@/lib/integrations/openai/event-investigation';
import { researchWorkflow } from '@/lib/workflows/blog-research';
import { ValidationError } from '@/lib/errors';
import type { ResearchInput, ResearchOutput, ResearchPage, ResearchRun } from '@/types/blog-research.types';

// Normalized provider boundary: other search implementations can return the same report.
export function investigate(input: ResearchInput): Promise<ResearchOutput> { return investigateEvent(input); }

export async function list(id: string, page: number): Promise<ResearchPage> {
  if (!await getDraft(id)) throw new ValidationError('Blog draft not found',404);
  return listRuns(id,page);
}
export async function request(id: string, eventIds: string[]): Promise<ResearchRun> {
  if (eventIds.length < 1 || eventIds.length > 5 || new Set(eventIds).size !== eventIds.length) {
    throw new ValidationError('Invalid research selection',422);
  }
  const draft = await getDraft(id);
  if (!draft) throw new ValidationError('Blog draft not found',404);
  if (draft.status !== 'completed' || ['queued','running'].includes(draft.researchStatus ?? 'not_started')) throw new ValidationError('Research state conflict',409);
  if (!draft.generationContext || draft.generationContext.format !== 'regional-selection' ||
    eventIds.some(id => !draft.generationContext!.events.some(event => event.id === id))) throw new ValidationError('Invalid research selection',422);
  const runId = await claim(id,eventIds,'openai',researchModel);
  return launch(runId);
}

export async function requestSelection(input: SelectionInput): Promise<ResearchRun> {
  if (!isRegion(input.regionId) || input.eventIds.length !== 5 || new Set(input.eventIds).size !== 5) throw new ValidationError('Invalid research selection',422);
  const events = await researchEvents(input.regionId,input.eventIds);
  if (events.length !== 5 || events.some(event => !event.name.trim())) throw new ValidationError('Invalid research selection',422);
  const runId = await createRun(input.regionId,events,'openai',researchModel);
  return launch(runId);
}

export function listIndependent(page: number): Promise<ResearchPage> { return listRuns(null,page); }
export function get(id: string): Promise<ResearchRun> { return getRun(id); }

async function launch(runId: string): Promise<ResearchRun> {
  // Read the accepted snapshot before starting; if this read fails, release the claim too.
  let run: ResearchRun;
  let workflowId: string;
  try {
    run = await getRun(runId);
    const workflow = await start(researchWorkflow,[{runId}]);
    workflowId = workflow.runId;
  } catch (error) {
    await fail(runId,'start_failed');
    throw error;
  }
  try { await track(runId,workflowId); } catch (error) {
    console.error('Research workflow tracking failed',{runId,workflowId,error});
  }
  return run;
}

import { prepareStep as prepareResearchStep, runResearch } from '@/lib/workflows/blog-research';
import { fromResearch } from '@/lib/services/blog-writing-context';
import { edit } from '@/lib/services/blog-editing';
import type { WritingResult } from '@/types/blog-writing.types';
import { write } from '@/lib/services/blog-writing';
import { writingLinks } from '@/lib/blog/links';
import type { SelectionContext } from '@/types/blog-selection.types';
import { FatalError, getWorkflowMetadata } from 'workflow';
import { runEvaluation } from '@/lib/workflows/blog-evaluation';
import { completeDraft, getDraft, markFailed, markRunning } from '@/lib/db/blog-drafts';
import { generate } from '@/lib/services/blog-article';
import { tracker } from '@/lib/services/blog-costs';
import { trackCost } from '@/lib/workflows/blog-costs';
import type { InferenceCall } from '@/types/blog-cost.types';
import { GenerationError } from '@/lib/blog/content';
import type { GeneratedArticle, GenerationFailure } from '@/types/blog-article.types';

export async function prepareStep(id: string): Promise<{instructions: string; context?: SelectionContext | null; researchId?:string|null}> {
  'use step';
  const draft = await getDraft(id);
  if (!draft) throw new FatalError('Draft not found');
  await markRunning(id);
  return {instructions: draft.instructions, context: draft.generationContext,researchId:draft.generationResearchId};
}

export async function generateStep(instructions: string, context?: SelectionContext | null): Promise<
  ({ result: GeneratedArticle; error: null } | { result: null; error: GenerationFailure }) & {call:InferenceCall|null}
> {
  'use step';
  const tracked = tracker('generation');
  try { return { result: await generate(instructions, context, tracked.observe), error: null, call: tracked.call() }; } catch (error) {
    return { result: null, error: error instanceof GenerationError ? error.code : 'api_error', call: tracked.call(error) };
  }
}
generateStep.maxRetries = 0;

type WrittenArticle = WritingResult & {links:string[];references:import('@/types/blog-writing.types').WritingResult['references']};
export async function writeStep(researchId:string):Promise<{result:WrittenArticle|null;error:string|null;call:InferenceCall|null}> {
  'use step';
  const request = await fromResearch(researchId);
  const tracked = tracker('writing');
  try {
    const result = await write(request,tracked.observe);
    return {result:{...result,links:writingLinks(request)},error:null,call:tracked.call()};
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'writing_failed';
    return {result:null,error:code,call:tracked.call(error)};
  }
}
writeStep.maxRetries = 0;

export async function editStep(researchId: string, source: WritingResult): Promise<{result: WrittenArticle | null; error: string | null; call: InferenceCall | null}> {
  'use step';
  const context = await fromResearch(researchId);
  const tracked = tracker('editing');
  try {
    const result = await edit({ source, context }, tracked.observe);
    return { result: { ...result, links: writingLinks(context) }, error: null, call: tracked.call() };
  } catch (error) {
    const code = error instanceof GenerationError ? error.code : 'editing_failed';
    return { result: null, error: code, call: tracked.call(error) };
  }
}
editStep.maxRetries = 0;


export async function saveStep(id: string, result: GeneratedArticle & {links?:string[];references?:import('@/types/blog-writing.types').WritingResult['references']}): Promise<string> {
  'use step';
  const attemptId = await completeDraft(id, result);
  console.log('Blog generation completed', {
    draftId: id, responseId: result.responseId, model: result.model,
    durationMs: result.durationMs, usage: result.usage,
  });
  return attemptId;
}

export async function failStep(id: string, code: string): Promise<void> {
  'use step';
  await markFailed(id, code);
}

export async function articleWorkflow(input: { id: string }): Promise<void> {
  'use workflow';
  let failure = 'workflow_error';
  let attemptId: string;
  try {
    const source = await prepareStep(input.id);
    let generated: {result:WrittenArticle|GeneratedArticle|null;error:string|null;call:InferenceCall|null};
    if (source.researchId) {
      failure = 'research_failed';
      await runResearch(await prepareResearchStep(source.researchId),getWorkflowMetadata().workflowRunId);
      const research = await prepareResearchStep(source.researchId);
      if (research.status === 'failed' || !research.results.some(result => result.status === 'completed')) throw new FatalError(failure);
      failure = 'writing_failed';
      generated = await writeStep(source.researchId);
    } else generated = await generateStep(source.instructions, source.context);
    if (generated.call) await trackCost({key:`writing:${input.id}`,stage:'writing',draftId:input.id,researchResultId:null,evaluationAttemptId:null,errorCode:generated.error,call:generated.call});
    if (!generated.result) {
      failure = source.researchId ? 'writing_failed' : generated.error ?? 'writing_failed';
      throw new FatalError(failure);
    }
    let finalArticle = generated.result;
    if (source.researchId) {
      failure = 'writing_failed';
      const edited = await editStep(source.researchId, generated.result as WrittenArticle);
      if (edited.call) await trackCost({key:`editing:${input.id}`,stage:'writing',draftId:input.id,researchResultId:null,evaluationAttemptId:null,errorCode:edited.error,call:edited.call});
      if (!edited.result) throw new FatalError(failure);
      finalArticle = edited.result;
    }
    failure = 'save_failed';
    attemptId = await saveStep(input.id, finalArticle);
  } catch {
    await failStep(input.id, failure);
    throw new FatalError(failure);
  }
  // Evaluation failure cannot change a successfully persisted article.
  await runEvaluation(input.id, getWorkflowMetadata().workflowRunId, attemptId);
}

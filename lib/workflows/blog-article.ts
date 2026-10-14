import type { SelectionContext } from '@/types/blog-selection.types';
import { FatalError, getWorkflowMetadata } from 'workflow';
import { runEvaluation } from '@/lib/workflows/blog-evaluation';
import { completeDraft, getDraft, markFailed, markRunning } from '@/lib/db/blog-drafts';
import { generate } from '@/lib/services/blog-article';
import { GenerationError } from '@/lib/blog/content';
import type { GeneratedArticle, GenerationFailure } from '@/types/blog-article.types';

export async function prepareStep(id: string): Promise<{instructions: string; context?: SelectionContext | null}> {
  'use step';
  const draft = await getDraft(id);
  if (!draft) throw new FatalError('Draft not found');
  await markRunning(id);
  return {instructions: draft.instructions, context: draft.generationContext};
}

export async function generateStep(instructions: string, context?: SelectionContext | null): Promise<
  { result: GeneratedArticle; error: null } | { result: null; error: GenerationFailure }
> {
  'use step';
  try { return { result: context ? await generate(instructions, context) : await generate(instructions), error: null }; } catch (error) {
    return { result: null, error: error instanceof GenerationError ? error.code : 'api_error' };
  }
}
generateStep.maxRetries = 0;

export async function saveStep(id: string, result: GeneratedArticle): Promise<string> {
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
    const generated = await generateStep(source.instructions, source.context);
    if (!generated.result) {
      failure = generated.error;
      throw new FatalError(failure);
    }
    failure = 'save_failed';
    attemptId = await saveStep(input.id, generated.result);
  } catch {
    await failStep(input.id, failure);
    throw new FatalError(failure);
  }
  // Evaluation failure cannot change a successfully persisted article.
  await runEvaluation(input.id, getWorkflowMetadata().workflowRunId, attemptId);
}

import { FatalError, getWorkflowMetadata } from 'workflow';
import { getDraft } from '@/lib/db/blog-drafts';
import { begin, fail, save } from '@/lib/db/blog-evaluations';
import { evaluate, scoringInput } from '@/lib/services/blog-evaluation';
import { tracker } from '@/lib/services/blog-costs';
import { trackCost } from '@/lib/workflows/blog-costs';
import type { InferenceCall } from '@/types/blog-cost.types';
import { EvaluationError } from '@/lib/blog/scoring/result';
import { calibrationInput } from '@/lib/blog/scoring/calibration';
import type { Evaluation, ScoringInput } from '@/types/blog-evaluation.types';

export async function prepareEvaluationStep(id: string, runId: string, attemptId:string): Promise<ScoringInput> {
  'use step';
  await begin(id,runId,attemptId);
  const draft = await getDraft(id);
  if (!draft || draft.status !== 'completed') throw new FatalError('Article not completed');
  return calibrationInput(scoringInput(draft),process.env.NEXT_PUBLIC_SUPABASE_URL);
}
export async function evaluateStep(input: ScoringInput): Promise<{result:Evaluation|null;error:string|null;call:InferenceCall|null}> {
  'use step';
  const tracked = tracker('evaluation');
  try { return {result:await evaluate(input,tracked.observe),error:null,call:tracked.call()}; } catch (error) {
    return {result:null,error:error instanceof EvaluationError ? error.code : 'api_error',call:tracked.call(error)};
  }
}
evaluateStep.maxRetries = 0;
export async function saveEvaluationStep(id: string, runId: string, result: Evaluation, attemptId:string): Promise<void> {
  'use step';
  await save(id,runId,result,attemptId);
}
export async function failEvaluationStep(id: string, runId: string, code: string, attemptId:string): Promise<void> {
  'use step';
  await fail(id,code,runId,attemptId);
}
export async function runEvaluation(id: string, runId: string, attemptId:string): Promise<void> {
  let code = 'workflow_error';
  try {
    const input = await prepareEvaluationStep(id,runId,attemptId);
    const output = await evaluateStep(input);
    // Each attempt keeps its own record, so a manual retry never replaces earlier costs.
    if (output.call) await trackCost({key:`evaluation:${id}:${attemptId}`,stage:'evaluation',draftId:id,researchResultId:null,evaluationAttemptId:attemptId,errorCode:output.error,call:output.call});
    if (!output.result) { code = output.error ?? 'invalid_evaluation'; throw new FatalError(code); }
    code = 'save_failed';
    await saveEvaluationStep(id,runId,output.result,attemptId);
  } catch {
    await failEvaluationStep(id,runId,code,attemptId);
    throw new FatalError(code);
  }
}
export async function evaluationWorkflow(input: {id:string;attemptId:string}): Promise<void> {
  'use workflow';
  await runEvaluation(input.id,getWorkflowMetadata().workflowRunId,input.attemptId);
}

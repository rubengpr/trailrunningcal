import { FatalError, getWorkflowMetadata } from 'workflow';
import { begin, fail, finish, getRun } from '@/lib/db/blog-research';
import { investigate } from '@/lib/services/blog-research';
import { tracker } from '@/lib/services/blog-costs';
import { trackCost } from '@/lib/workflows/blog-costs';
import type { InferenceCall } from '@/types/blog-cost.types';
import { ResearchError } from '@/lib/blog/research/result';
import type { ResearchInput, ResearchOutput, ResearchMetadata, ResearchRun } from '@/types/blog-research.types';

export async function prepareStep(runId: string): Promise<ResearchRun> {
  'use step';
  return getRun(runId);
}
export async function beginStep(runId: string, resultId: string, workflowId: string): Promise<void> {
  'use step';
  await begin(runId,resultId,workflowId);
}
export async function investigateStep(input: ResearchInput): Promise<{output:ResearchOutput|null;error:string|null;metadata?:ResearchMetadata;call:InferenceCall|null}> {
  'use step';
  const tracked = tracker('research');
  try {
    const output = await investigate(input,tracked.observe);
    console.info('Blog investigation completed',{eventName:input.eventName,responseId:output.responseId,searchCalls:output.searchCalls,durationMs:output.durationMs,usage:output.usage});
    return {output,error:null,call:tracked.call()};
  } catch (error) {
    const code = error instanceof ResearchError ? error.code : 'api_error';
    console.error('Blog investigation failed',{eventName:input.eventName,code});
    return {output:null,error:code,...(error instanceof ResearchError && error.metadata ? {metadata:error.metadata} : {}),call:tracked.call(error instanceof ResearchError ? error : new ResearchError('api_error'))};
  }
}
investigateStep.maxRetries = 0;
export async function saveStep(runId: string, resultId: string, output: ResearchOutput|null, error: string|null, metadata?:ResearchMetadata): Promise<void> {
  'use step';
  await finish(runId,resultId,output,error,...(metadata ? [metadata] : []));
}
export async function failStep(runId: string, code: string): Promise<void> {
  'use step';
  await fail(runId,code);
}
export async function runResearch(run: ResearchRun, workflowId: string): Promise<void> {
  const results = await Promise.allSettled(run.results.map(async result => {
    await beginStep(run.id,result.id,workflowId);
    const response = await investigateStep({regionName:run.regionName,eventName:result.eventName});
    if (response.call) await trackCost({key:`research:${result.id}`,stage:'research',draftId:null,researchResultId:result.id,evaluationAttemptId:null,errorCode:response.error,call:response.call});
    await saveStep(run.id,result.id,response.output,response.error,response.metadata);
  }));
  // Wait for all independent branches before releasing any remaining failed work.
  if (results.some(result => result.status === 'rejected')) {
    await failStep(run.id,'workflow_error');
    throw new FatalError('Research workflow failed');
  }
}
export async function researchWorkflow({runId}: {runId:string}): Promise<void> {
  'use workflow';
  try {
    const run = await prepareStep(runId);
    await runResearch(run,getWorkflowMetadata().workflowRunId);
  } catch {
    await failStep(runId,'workflow_error');
    throw new FatalError('Research workflow failed');
  }
}

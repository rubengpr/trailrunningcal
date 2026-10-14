import { FatalError, getWorkflowMetadata } from 'workflow';
import { begin, fail, finish, getRun } from '@/lib/db/blog-research';
import { investigate } from '@/lib/services/blog-research';
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
export async function investigateStep(input: ResearchInput): Promise<{output:ResearchOutput|null;error:string|null;metadata?:ResearchMetadata}> {
  'use step';
  try {
    const output = await investigate(input);
    console.info('Blog investigation completed',{eventName:input.eventName,responseId:output.responseId,searchCalls:output.searchCalls,durationMs:output.durationMs,usage:output.usage});
    return {output,error:null};
  } catch (error) {
    const code = error instanceof ResearchError ? error.code : 'api_error';
    console.error('Blog investigation failed',{eventName:input.eventName,code});
    return {output:null,error:code,...(error instanceof ResearchError && error.metadata ? {metadata:error.metadata} : {})};
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
    const response = await investigateStep({regionName:run.input.regionName,eventName:result.eventName});
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

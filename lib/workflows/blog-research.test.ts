import { beforeEach, expect, it, vi } from 'vitest';
import { output, run } from '@/tests/fixtures/blog-research';
import { ResearchError } from '@/lib/blog/research/result';
const mocks = vi.hoisted(() => ({begin:vi.fn(),finish:vi.fn(),fail:vi.fn(),getRun:vi.fn(),investigate:vi.fn()}));
vi.mock('workflow',() => ({FatalError:class extends Error {},getWorkflowMetadata:() => ({workflowRunId:'workflow'})}));
vi.mock('@/lib/db/blog-research',() => mocks);
vi.mock('@/lib/services/blog-research',() => ({investigate:mocks.investigate}));
import { investigateStep, researchWorkflow, saveStep } from './blog-research';
beforeEach(() => {vi.resetAllMocks();mocks.getRun.mockResolvedValue(run);mocks.investigate.mockResolvedValue(output);});
it('launches independent investigations in parallel and saves each result',async() => {
  const resolvers: ((value:typeof output)=>void)[] = [];
  mocks.investigate.mockImplementation(() => new Promise(resolve => resolvers.push(resolve)));
  const promise = researchWorkflow({runId:run.id});
  await vi.waitFor(() => expect(mocks.investigate).toHaveBeenCalledTimes(2));
  expect(mocks.finish).not.toHaveBeenCalled();resolvers.forEach(resolve => resolve(output));await promise;
  expect(mocks.finish).toHaveBeenCalledTimes(2);expect(mocks.fail).not.toHaveBeenCalled();
  expect(mocks.investigate.mock.calls.map(([input]) => input)).toEqual(run.results.map(result => ({regionName:run.input.regionName,eventName:result.eventName})));
});
it.each(['refused','incomplete','invalid_result','api_error','timeout'])('isolates event failure %s',async(code) => {
  mocks.investigate.mockRejectedValueOnce(new ResearchError(code));await researchWorkflow({runId:run.id});
  expect(mocks.finish).toHaveBeenCalledWith(run.id,run.results[0].id,null,code);
  expect(mocks.finish).toHaveBeenCalledWith(run.id,run.results[1].id,output,null);expect(mocks.fail).not.toHaveBeenCalled();
});
it('save retries never invoke research again',async() => {
  const result = await investigateStep({regionName:'Cataluña',eventName:'Event'});
  mocks.finish.mockRejectedValueOnce(new Error('temporary'));
  await expect(saveStep(run.id,'result',result.output,result.error)).rejects.toThrow();
  await saveStep(run.id,'result',result.output,result.error);
  expect(mocks.investigate).toHaveBeenCalledTimes(1);expect(investigateStep.maxRetries).toBe(0);
});
it('waits for other branches before marking an unrecoverable save failure',async() => {
  mocks.finish.mockRejectedValueOnce(new Error('DB'));
  await expect(researchWorkflow({runId:run.id})).rejects.toThrow();expect(mocks.finish).toHaveBeenCalledTimes(2);expect(mocks.fail).toHaveBeenCalled();
});

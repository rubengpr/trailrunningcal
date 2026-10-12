import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvaluationError } from '@/lib/blog/scoring/result';
const mocks=vi.hoisted(()=>({getDraft:vi.fn(),begin:vi.fn(),fail:vi.fn(),save:vi.fn(),evaluate:vi.fn(),scoringInput:vi.fn()}));
vi.mock('workflow',()=>({FatalError:class extends Error{},getWorkflowMetadata:()=>({workflowRunId:'run'})}));
vi.mock('@/lib/db/blog-drafts',()=>({getDraft:mocks.getDraft}));
vi.mock('@/lib/db/blog-evaluations',()=>({begin:mocks.begin,fail:mocks.fail,save:mocks.save}));
vi.mock('@/lib/services/blog-evaluation',()=>({evaluate:mocks.evaluate,scoringInput:mocks.scoringInput}));
import { evaluateStep, evaluationWorkflow, saveEvaluationStep } from './blog-evaluation';
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.getDraft.mockResolvedValue({status:'completed'});
  mocks.scoringInput.mockReturnValue({title:'Article',slug:'article'});
  mocks.evaluate.mockResolvedValue({score:80});
});
describe('evaluation workflow',()=>{
  it('prepares, evaluates and saves with the attempt token',async()=>{
    await evaluationWorkflow({id:'id',attemptId:'attempt'});
    expect(mocks.begin).toHaveBeenCalledWith('id','run','attempt');
    expect(mocks.save).toHaveBeenCalledWith('id','run',{score:80},'attempt');
    expect(mocks.fail).not.toHaveBeenCalled();
  });
  it.each(['refused','incomplete','invalid_evaluation','invalid_evidence','timeout','api_error'] as const)('records a safe evaluator failure %s',async code=>{
    mocks.evaluate.mockRejectedValue(new EvaluationError(code));
    await expect(evaluationWorkflow({id:'id',attemptId:'attempt'})).rejects.toThrow(code);
    expect(mocks.fail).toHaveBeenCalledWith('id',code,'run','attempt');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.evaluate).toHaveBeenCalledTimes(1);
  });
  it('does not call the model if preparing the draft fails',async()=>{
    mocks.begin.mockRejectedValue(new Error('DB failure'));
    await expect(evaluationWorkflow({id:'id',attemptId:'attempt'})).rejects.toThrow('workflow_error');
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('retries saving an already generated report without repeating the evaluation',async()=>{
    const input=mocks.scoringInput();
    const output=await evaluateStep(input);
    if (!output.result) throw new Error('Missing report');
    mocks.save.mockRejectedValueOnce(new Error('Transient write'));
    await expect(saveEvaluationStep('id','run',output.result,'attempt')).rejects.toThrow('Transient write');
    await saveEvaluationStep('id','run',output.result,'attempt');
    expect(mocks.evaluate).toHaveBeenCalledTimes(1);
    expect(evaluateStep.maxRetries).toBe(0);
  });
  it('records exhausted saving errors independently',async()=>{
    mocks.save.mockRejectedValue(new Error('DB failure'));
    await expect(evaluationWorkflow({id:'id',attemptId:'attempt'})).rejects.toThrow('save_failed');
    expect(mocks.fail).toHaveBeenCalledWith('id','save_failed','run','attempt');
    expect(mocks.evaluate).toHaveBeenCalledTimes(1);
  });
});

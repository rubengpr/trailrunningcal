import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({getDraft:vi.fn(),claim:vi.fn(),fail:vi.fn(),start:vi.fn()}));
vi.mock('workflow/api',()=>({start:mocks.start}));
vi.mock('@/lib/workflows/blog-article',()=>({articleWorkflow:vi.fn()}));
vi.mock('@/lib/workflows/blog-evaluation',()=>({evaluationWorkflow:vi.fn()}));
vi.mock('@/lib/db/blog-drafts',()=>({getDraft:mocks.getDraft,createDraft:vi.fn(),listDrafts:vi.fn(),markFailed:vi.fn(),setRunId:vi.fn()}));
vi.mock('@/lib/db/blog-evaluations',()=>({claim:mocks.claim,fail:mocks.fail}));
import { evaluateDraft } from './blog-drafts';
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.getDraft.mockResolvedValue({id:'id',status:'completed',evaluationStatus:'not_evaluated'});
  mocks.claim.mockResolvedValue('attempt');
  mocks.start.mockResolvedValue({runId:'run'});
});
describe('manual evaluation request',()=>{
  it('starts only after a successful atomic claim',async()=>{
    expect(await evaluateDraft('id')).toMatchObject({evaluationStatus:'queued',status:'completed'});
    expect(mocks.start.mock.calls[0][1]).toEqual([{id:'id',attemptId:'attempt'}]);
  });
  it('returns null for absent resources without starting or claiming',async()=>{
    mocks.getDraft.mockResolvedValue(null);
    expect(await evaluateDraft('missing')).toBeNull();
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('rejects articles still generating',async()=>{
    mocks.getDraft.mockResolvedValue({status:'running'});
    await expect(evaluateDraft('id')).rejects.toMatchObject({status:409});
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('does not start a competing or already evaluated job',async()=>{
    mocks.claim.mockResolvedValue(null);
    await expect(evaluateDraft('id')).rejects.toMatchObject({status:409});
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('records start failure against the same attempt and leaves the article intact',async()=>{
    mocks.start.mockRejectedValue(new Error('Private provider details'));
    await expect(evaluateDraft('id')).rejects.toThrow('Evaluation start failed');
    expect(mocks.fail).toHaveBeenCalledWith('id','start_failed',null,'attempt');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({getDraft:vi.fn(),deleteDraft:vi.fn()}));
vi.mock('workflow/api',()=>({start:vi.fn()}));
vi.mock('@/lib/workflows/blog-article',()=>({articleWorkflow:vi.fn()}));
vi.mock('@/lib/workflows/blog-evaluation',()=>({evaluationWorkflow:vi.fn()}));
vi.mock('@/lib/db/blog-drafts',()=>({...mocks,createDraft:vi.fn(),listDrafts:vi.fn(),markFailed:vi.fn(),setRunId:vi.fn()}));
vi.mock('@/lib/db/blog-evaluations',()=>({claim:vi.fn(),fail:vi.fn()}));
import { remove } from './blog-drafts';
beforeEach(()=>{vi.resetAllMocks();mocks.getDraft.mockResolvedValue({status:'completed',evaluationStatus:'not_evaluated'});mocks.deleteDraft.mockResolvedValue(true);});
describe('blog deletion rules',()=>{
  it.each(['completed','failed'])('allows terminal article %s',async status=>{mocks.getDraft.mockResolvedValue({status,evaluationStatus:'failed'});await remove('id');expect(mocks.deleteDraft).toHaveBeenCalledWith('id');});
  it('rejects missing drafts before a write',async()=>{mocks.getDraft.mockResolvedValue(null);await expect(remove('id')).rejects.toMatchObject({status:404});expect(mocks.deleteDraft).not.toHaveBeenCalled();});
  it.each([['queued','not_evaluated'],['running','not_evaluated'],['completed','queued'],['completed','running']])('blocks active work %s/%s',async(status,evaluationStatus)=>{
    mocks.getDraft.mockResolvedValue({status,evaluationStatus});await expect(remove('id')).rejects.toMatchObject({status:409});expect(mocks.deleteDraft).not.toHaveBeenCalled();
  });
  it('rejects a concurrent evaluation claim',async()=>{mocks.deleteDraft.mockResolvedValue(false);mocks.getDraft.mockResolvedValueOnce({status:'completed',evaluationStatus:'not_evaluated'}).mockResolvedValueOnce({status:'completed',evaluationStatus:'queued'});await expect(remove('id')).rejects.toMatchObject({status:409});});
  it('returns 404 if another admin deletes first',async()=>{mocks.deleteDraft.mockResolvedValue(false);mocks.getDraft.mockResolvedValueOnce({status:'completed',evaluationStatus:'completed'}).mockResolvedValueOnce(null);await expect(remove('id')).rejects.toMatchObject({status:404});});
  it('propagates write errors',async()=>{mocks.deleteDraft.mockRejectedValue(new Error('DB'));await expect(remove('id')).rejects.toThrow('DB');});
});

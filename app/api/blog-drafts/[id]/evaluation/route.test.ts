import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError, ValidationError } from '@/lib/errors';
const mocks=vi.hoisted(()=>({requireAdmin:vi.fn(),evaluateDraft:vi.fn()}));
vi.mock('@/lib/auth',()=>({requireAdmin:mocks.requireAdmin}));
vi.mock('@/lib/services/blog-drafts',()=>({evaluateDraft:mocks.evaluateDraft}));
import { POST } from './route';
const id='a1ff4789-cbd0-40c7-9802-92c0b97a1914';
const call=(value=id)=>POST(new Request('http://localhost/api/blog-drafts/'+value+'/evaluation',{method:'POST'}),{params:Promise.resolve({id:value})});
beforeEach(()=>vi.resetAllMocks());
describe('evaluation POST',()=>{
  it.each([[new AuthError(),401],[new ForbiddenError(),403]])('checks authorization first %#',async(error,status)=>{
    mocks.requireAdmin.mockRejectedValue(error);expect((await call()).status).toBe(status);expect(mocks.evaluateDraft).not.toHaveBeenCalled();
  });
  it('rejects invalid UUIDs',async()=>{expect((await call('invalid')).status).toBe(400);expect(mocks.evaluateDraft).not.toHaveBeenCalled();});
  it('returns 404 when not found',async()=>{mocks.evaluateDraft.mockResolvedValue(null);expect((await call()).status).toBe(404);});
  it('returns 409 for concurrent or completed evaluations',async()=>{mocks.evaluateDraft.mockRejectedValue(new ValidationError('Evaluation state conflict',409));expect((await call()).status).toBe(409);});
  it('returns accepted state',async()=>{
    const data={id,evaluationStatus:'queued'};mocks.evaluateDraft.mockResolvedValue(data);
    const result=await call();expect(result.status).toBe(202);expect(await result.json()).toEqual({success:true,data});
  });
  it('hides unexpected errors',async()=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    try {mocks.evaluateDraft.mockRejectedValue(new Error('private'));const result=await call();expect(result.status).toBe(500);expect(await result.json()).toEqual({error:'Internal server error'});} finally {log.mockRestore();}
  });
});

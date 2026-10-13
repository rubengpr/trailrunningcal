import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDraft, DraftRequestError } from './blog-drafts';
const fetchMock=vi.fn();
beforeEach(()=>{fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock);});
afterEach(()=>vi.unstubAllGlobals());
describe('deletion API client',()=>{
  it('sends DELETE with a cancellation signal and accepts the response',async()=>{
    fetchMock.mockResolvedValue(new Response(JSON.stringify({success:true,data:null}),{status:200}));const controller=new AbortController();
    await expect(deleteDraft('draft id',controller.signal)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/blog-drafts/draft%20id',{method:'DELETE',signal:controller.signal});
  });
  it.each([404,409,500])('preserves HTTP status %s without raw server errors',async status=>{
    fetchMock.mockResolvedValue(new Response('{"error":"Private detail"}',{status}));
    try{await deleteDraft('id');throw new Error('Expected rejection');}catch(error){expect(error).toBeInstanceOf(DraftRequestError);expect(error).toMatchObject({status,message:'Request failed'});}
  });
});

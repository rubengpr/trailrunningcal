import { beforeEach, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError, ValidationError } from '@/lib/errors';
import { run } from '@/tests/fixtures/blog-research';
const mocks = vi.hoisted(() => ({requireAdmin:vi.fn(),list:vi.fn(),request:vi.fn()}));
vi.mock('@/lib/auth',() => ({requireAdmin:mocks.requireAdmin}));
vi.mock('@/lib/services/blog-research',() => mocks);
import { GET, POST } from './route';
const params = {params:Promise.resolve({id:run.draftId})};
const get = (query='') => GET(new Request('http://localhost/api/blog-drafts/'+run.draftId+'/research'+query),params);
const post = (body: unknown) => POST(new Request('http://localhost/api/blog-drafts/'+run.draftId+'/research',{method:'POST',body:JSON.stringify(body)}),params);
beforeEach(() => vi.resetAllMocks());
it.each([[new AuthError(),401],[new ForbiddenError(),403]])('authorizes both methods before delegation %#',async(error,status) => {
  mocks.requireAdmin.mockRejectedValue(error);expect((await get()).status).toBe(status);expect((await post(null)).status).toBe(status);
  expect(mocks.list).not.toHaveBeenCalled();expect(mocks.request).not.toHaveBeenCalled();
});
it.each([null,[],{}, {eventIds:'id'},{eventIds:[1]},{eventIds:['invalid']}])('rejects malformed input %#',async(body) => {
  expect((await post(body)).status).toBe(400);expect(mocks.request).not.toHaveBeenCalled();
});
it('rejects invalid JSON and draft UUID',async() => {
  expect((await POST(new Request('http://localhost',{method:'POST',body:'{'}),params)).status).toBe(400);
  expect((await GET(new Request('http://localhost'),{params:Promise.resolve({id:'bad'})})).status).toBe(400);
});
it('accepts valid selection and hides internal execution identifiers',async() => {
  mocks.request.mockResolvedValue(run);const result = await post({eventIds:run.input.events.map(event => event.id)});
  expect(result.status).toBe(202);expect(await result.json()).toEqual({success:true,data:run});
});
it.each([404,409,422])('keeps domain error status %s',async(status) => {
  mocks.request.mockRejectedValue(new ValidationError('safe',status));expect((await post({eventIds:[]})).status).toBe(status);
});
it('validates page and disables caching',async() => {
  expect((await get('?page=0')).status).toBe(400);expect(mocks.list).not.toHaveBeenCalled();
  mocks.list.mockResolvedValue({runs:[]});const result = await get('?page=2');
  expect(result.headers.get('Cache-Control')).toBe('private, no-store');expect(mocks.list).toHaveBeenCalledWith(run.draftId,2);
});
it('hides unexpected failures',async() => {
  const log = vi.spyOn(console,'error').mockImplementation(() => {});
  mocks.list.mockRejectedValue(new Error('private'));const result = await get();expect(result.status).toBe(500);
  expect(await result.json()).toEqual({error:'Internal server error'});log.mockRestore();
});

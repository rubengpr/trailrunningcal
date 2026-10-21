import { beforeEach, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError, ValidationError } from '@/lib/errors';
import { context } from '@/tests/fixtures/blog-selection';
import { run } from '@/tests/fixtures/blog-research';
const mocks = vi.hoisted(() => ({requireAdmin:vi.fn(),listIndependent:vi.fn(),requestSelection:vi.fn(),get:vi.fn()}));
vi.mock('@/lib/auth',() => ({requireAdmin:mocks.requireAdmin}));
vi.mock('@/lib/services/blog-research',() => mocks);
import { GET, POST } from './route';
import { GET as detail } from './[id]/route';
const input = {regionId:context.regionId,eventIds:context.events.map(event => event.id)};
const post = (body:unknown) => POST(new Request('http://localhost/api/blog-research',{method:'POST',body:JSON.stringify(body)}));
const params = {params:Promise.resolve({id:run.id})};
beforeEach(() => vi.resetAllMocks());
it.each([[new AuthError(),401],[new ForbiddenError(),403]])('checks authorization before all validation and queries %#',async(error,status) => {
  mocks.requireAdmin.mockRejectedValue(error);
  expect((await GET(new Request('http://localhost?page=0'))).status).toBe(status);
  expect((await post(null)).status).toBe(status);expect((await detail(new Request('http://localhost'),params)).status).toBe(status);
  expect(mocks.listIndependent).not.toHaveBeenCalled();expect(mocks.requestSelection).not.toHaveBeenCalled();expect(mocks.get).not.toHaveBeenCalled();
});
it.each([null,[],{instructions:'Valid legacy text'}, {}, {regionId:12,eventIds:[]},{regionId:'cataluna',eventIds:['invalid']}])('rejects malformed selection %#',async(body) => {
  expect((await post(body)).status).toBe(400);expect(mocks.requestSelection).not.toHaveBeenCalled();
});
it('rejects malformed JSON',async() => {
  expect((await POST(new Request('http://localhost',{method:'POST',body:'{'}))).status).toBe(400);
});
it('accepts research and returns the run without a draft',async() => {
  mocks.requestSelection.mockResolvedValue({...run,draftId:null});const response = await post(input);
  expect(response.status).toBe(202);expect((await response.json()).data.draftId).toBeNull();expect(mocks.requestSelection).toHaveBeenCalledWith(input);
});
it('validates pagination and returns uncached history',async() => {
  expect((await GET(new Request('http://localhost?page=-1'))).status).toBe(400);
  mocks.listIndependent.mockResolvedValue({runs:[]});const response = await GET(new Request('http://localhost?page=2'));
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(mocks.listIndependent).toHaveBeenCalledWith(2);
});
it('resolves a run and preserves not-found errors',async() => {
  mocks.get.mockResolvedValue(run);const response = await detail(new Request('http://localhost'),params);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(mocks.get).toHaveBeenCalledWith(run.id);
  expect((await detail(new Request('http://localhost'),{params:Promise.resolve({id:'invalid'})})).status).toBe(400);
  mocks.get.mockRejectedValue(new ValidationError('Research not found',404));expect((await detail(new Request('http://localhost'),params)).status).toBe(404);
});
it('keeps selection errors and hides unexpected failures',async() => {
  mocks.requestSelection.mockRejectedValueOnce(new ValidationError('invalid_selection',422));expect((await post(input)).status).toBe(422);
  const log = vi.spyOn(console,'error').mockImplementation(() => {});mocks.requestSelection.mockRejectedValueOnce(new Error('secret'));
  const response = await post(input);expect(response.status).toBe(500);expect(await response.json()).toEqual({error:'Internal server error'});log.mockRestore();
});

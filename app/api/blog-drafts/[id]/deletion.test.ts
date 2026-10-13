import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError, ValidationError } from '@/lib/errors';
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), remove: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/services/blog-drafts', () => ({ remove: mocks.remove, get: mocks.get }));
import { DELETE } from './route';
const id = 'a1ff4789-cbd0-40c7-9802-92c0b97a1914';
const call = (value = id) => DELETE(new Request('http://localhost/api/blog-drafts/'+value, {method:'DELETE'}), {params:Promise.resolve({id:value})});
beforeEach(() => vi.resetAllMocks());
describe('blog deletion endpoint', () => {
  it.each([[new AuthError(),401],[new ForbiddenError(),403]])('authorizes before parsing or deletion %#', async(error,status) => {
    mocks.requireAdmin.mockRejectedValue(error);
    expect((await call('invalid')).status).toBe(status);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('rejects invalid IDs', async() => { expect((await call('invalid')).status).toBe(400); expect(mocks.remove).not.toHaveBeenCalled(); });
  it.each([404,409])('preserves domain status %i', async status => {
    mocks.remove.mockRejectedValue(new ValidationError('Domain error',status));
    expect((await call()).status).toBe(status);
  });
  it('returns the existing deletion contract', async() => {
    const response=await call();expect(response.status).toBe(200);
    expect(await response.json()).toEqual({success:true,data:null});
    expect(mocks.remove).toHaveBeenCalledWith(id);
  });
  it('hides unexpected details', async() => {
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    try { mocks.remove.mockRejectedValue(new Error('Private data'));const response=await call();expect(response.status).toBe(500);expect(await response.json()).toEqual({error:'Internal server error'}); } finally {log.mockRestore();}
  });
});

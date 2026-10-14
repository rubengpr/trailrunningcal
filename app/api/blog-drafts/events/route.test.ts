import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, ForbiddenError, ValidationError } from '@/lib/errors';
const mocks = vi.hoisted(() => ({requireAdmin: vi.fn(), list: vi.fn()}));
vi.mock('@/lib/auth', () => ({requireAdmin: mocks.requireAdmin}));
vi.mock('@/lib/services/blog-selection', () => ({list: mocks.list}));
import { GET } from './route';
beforeEach(() => {vi.resetAllMocks(); mocks.list.mockResolvedValue({events: [], pagination: {page: 1, pageSize: 50, total: 0, totalPages: 0}});});
describe('selection event endpoint', () => {
  it.each([new AuthError(), new ForbiddenError()])('authorizes before validating or reading', async error => {
    mocks.requireAdmin.mockRejectedValue(error);
    expect((await GET(new Request('http://localhost/api/blog-drafts/events'))).status).toBe(error instanceof AuthError ? 401 : 403);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it.each(['', '?regionId=catalonia&page=0', '?regionId=catalonia&page=1.5'])('rejects malformed query %s', async query => {
    expect((await GET(new Request('http://localhost/api/blog-drafts/events'+query))).status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('returns the paginated envelope without caching', async () => {
    const result = await GET(new Request('http://localhost/api/blog-drafts/events?regionId=catalonia&search=Ultra&page=2'));
    expect(result.status).toBe(200); expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await result.json()).toMatchObject({success: true}); expect(mocks.list).toHaveBeenCalledWith('catalonia','Ultra',2);
  });
  it('maps invalid communities and hides unexpected failures', async () => {
    mocks.list.mockRejectedValueOnce(new ValidationError('invalid_selection',422)).mockRejectedValueOnce(new Error('private DB error'));
    expect((await GET(new Request('http://localhost/api/blog-drafts/events?regionId=andorra'))).status).toBe(422);
    const response = await GET(new Request('http://localhost/api/blog-drafts/events?regionId=catalonia'));
    expect(response.status).toBe(500); expect(await response.json()).toEqual({error: 'Internal server error'});
  });
});

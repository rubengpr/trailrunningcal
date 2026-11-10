import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), export: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('@/lib/services/blog-export', () => ({ exportDraft: mocks.export }));
import { AuthError, ForbiddenError, ValidationError } from '@/lib/errors';
import { POST } from './route';
const context = { params: Promise.resolve({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' }) };
const request = () => new Request('http://localhost/api', { method: 'POST' });
beforeEach(() => vi.resetAllMocks());
describe('export API', () => {
  it('authorizes before reading the draft', async () => {
    for (const [error, status] of [[new AuthError(), 401], [new ForbiddenError(), 403]] as const) {
      mocks.auth.mockRejectedValueOnce(error); expect((await POST(request(), context)).status).toBe(status);
    }
    expect(mocks.export).not.toHaveBeenCalled();
  });
  it('validates UUIDs and translates safe domain errors', async () => {
    expect((await POST(request(), { params: Promise.resolve({ id: 'bad' }) })).status).toBe(400);
    for (const status of [404, 422]) {
      mocks.export.mockRejectedValueOnce(new ValidationError('missing_alt', status));
      const response = await POST(request(), context); expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: 'missing_alt' });
    }
  });
  it('downloads a non-cacheable MDX file', async () => {
    mocks.export.mockResolvedValue({ filename: 'mejores-carreras.mdx', content: '# Artículo' });
    const response = await POST(request(), context);
    expect(response.status).toBe(200); expect(response.headers.get('content-disposition')).toContain('mejores-carreras.mdx');
    expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(await response.text()).toBe('# Artículo');
  });
});

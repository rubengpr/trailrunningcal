import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), require: vi.fn(), add: vi.fn(), edit: vi.fn(), replace: vi.fn(), read: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('@/lib/services/blog-article-images', () => ({ requireDocument: mocks.require, addImage: mocks.add, editImage: mocks.edit, replaceImage: mocks.replace, readImage: mocks.read, removeImage: mocks.remove }));
import { AuthError, ForbiddenError } from '@/lib/errors';
import { POST as insert } from './route';
import { GET, POST, PATCH, DELETE } from './[imageId]/route';
import { parseEdit, parseVersion } from './validation';
const id = '9b0838e9-dba5-4bec-9d6f-41b5187e4fd6', imageId = 'ae5d1bf1-88ff-4a08-9234-08ba4b7beb97';
const context = { params: Promise.resolve({ id, imageId }) };
beforeEach(() => { vi.resetAllMocks(); mocks.add.mockResolvedValue({ blocks: [], version: 1 }); });
describe('article image API', () => {
  it.each([insert, GET, POST, PATCH, DELETE])('authorizes before body parsing or data access', async handler => {
    for (const [error, status] of [[new AuthError(), 401], [new ForbiddenError(), 403]] as const) {
      mocks.auth.mockRejectedValueOnce(error);
      const request = new Request('http://localhost/api', { method: 'POST' });
      const form = vi.spyOn(request, 'formData'), json = vi.spyOn(request, 'json');
      expect((await handler(request, context)).status).toBe(status);
      expect(form).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled();
    }
    for (const action of [mocks.require, mocks.add, mocks.edit, mocks.replace, mocks.read, mocks.remove]) expect(action).not.toHaveBeenCalled();
  });
  it('validates identifiers, body types and arbitrary text updates', async () => {
    const bad = { params: Promise.resolve({ id, imageId: 'bad' }) };
    expect((await PATCH(new Request('http://localhost', { method: 'PATCH', body: '{}' }), bad)).status).toBe(400);
    for (const value of [null, [], {}, { action: 'move', direction: ['up'], version: 0 }, { action: 'update', alt: 'x', caption: 'x', version: 0, html: '<p>rewrite</p>' }]) expect(() => parseEdit(value)).toThrow();
    for (const value of [null, -1, 'foo', {}, 0.5]) expect(() => parseVersion(value)).toThrow();
  });
  it('creates images at a validated insertion point', async () => {
    const body = new FormData(); body.set('image', new File(['png'], 'x.png', { type: 'image/png' })); body.set('afterId', 'text-0'); body.set('version', '0');
    const response = await insert(new Request('http://localhost', { method: 'POST', body }), context);
    expect(response.status).toBe(201); expect(mocks.add).toHaveBeenCalledWith(id, expect.any(File), 'text-0', 0);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('rejects malformed uploads without calling storage services', async () => {
    const body = new FormData(); body.set('image', 'not-file'); body.set('version', '0'); body.set('afterId', '');
    expect((await insert(new Request('http://localhost', { method: 'POST', body }), context)).status).toBe(400);
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it('serves protected binary images and validates delete versions', async () => {
    mocks.read.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    const response = await GET(new Request('http://localhost'), context);
    expect(response.headers.get('content-type')).toBe('image/png'); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect((await DELETE(new Request('http://localhost?version=-1'), context)).status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.remove.mockResolvedValue({ blocks: [], version: 1 });
    expect((await DELETE(new Request('http://localhost?version=0'), context)).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith(id, imageId, 0);
  });
});

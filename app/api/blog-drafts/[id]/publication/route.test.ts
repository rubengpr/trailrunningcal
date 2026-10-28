import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn(), completed: vi.fn(), image: vi.fn(), read: vi.fn(), metadata: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('@/lib/services/blog-publication', () => ({ saveDetails: mocks.save, requireCompleted: mocks.completed, saveImage: mocks.image, readImage: mocks.read, getImageMetadata: mocks.metadata, removeImage: mocks.remove }));
import { AuthError, ForbiddenError } from '@/lib/errors';
import { PATCH } from './route';
import { DELETE, GET, POST } from './image/route';
import { GET as metadata } from './image/metadata/route';
import { parseDetails } from './validation';
const id = '9b0838e9-dba5-4bec-9d6f-41b5187e4fd6';
const context = { params: Promise.resolve({ id }) };
const details = { author: 'Ruben Godoy', date: '2026-10-28', imageAlt: '', version: 0 };
beforeEach(() => { vi.resetAllMocks(); mocks.save.mockResolvedValue(details); mocks.image.mockResolvedValue({ version: 1 }); });
describe('publication routes', () => {
  it('requires a single valid version before deleting an image', async () => {
    for (const query of ['', '?version=-1', '?version=a', '?version=1&version=2']) {
      expect((await DELETE(new Request(`http://localhost/api${query}`, { method: 'DELETE' }), context)).status).toBe(400);
    }
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.remove.mockResolvedValue({ version: 1 });
    expect((await DELETE(new Request('http://localhost/api?version=0', { method: 'DELETE' }), context)).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith(id, 0);
  });
  it.each([PATCH, POST, GET, metadata, DELETE])('authorizes before reading or writing', async handler => {
    for (const [error, status] of [[new AuthError(), 401], [new ForbiddenError(), 403]] as const) {
      mocks.auth.mockRejectedValueOnce(error);
      const request = new Request('http://localhost/api', { method: 'POST' });
      const json = vi.spyOn(request, 'json'); const form = vi.spyOn(request, 'formData');
      expect((await handler(request, context)).status).toBe(status);
      expect(json).not.toHaveBeenCalled(); expect(form).not.toHaveBeenCalled();
    }
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.image).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.completed).not.toHaveBeenCalled(); expect(mocks.metadata).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('validates UUIDs and JSON structures', async () => {
    expect((await PATCH(new Request('http://localhost'), { params: Promise.resolve({ id: 'bad' }) })).status).toBe(400);
    expect((await PATCH(new Request('http://localhost', { method: 'PATCH', body: '{' }), context)).status).toBe(400);
    for (const body of [null, [], {}, { ...details, version: -1 }, { ...details, author: 1 }, { ...details, extra: 'x' }]) expect(() => parseDetails(body)).toThrow();
  });
  it('saves details and rejects malformed multipart', async () => {
    const response = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(details) }), context);
    expect(response.status).toBe(200); expect(mocks.save).toHaveBeenCalledWith(id, details);
    expect((await POST(new Request('http://localhost', { method: 'POST', body: '{}' }), context)).status).toBe(400);
    expect(mocks.image).not.toHaveBeenCalled();
  });
  it('accepts one image and checks the request size', async () => {
    const body = new FormData(); body.set('image', new File(['png'], 'x.png', { type: 'image/png' })); body.set('version', '0');
    expect((await POST(new Request('http://localhost', { method: 'POST', body }), context)).status).toBe(200);
    expect(mocks.image).toHaveBeenCalledWith(id, expect.any(File), 0);
    expect((await POST(new Request('http://localhost', { method: 'POST', headers: { 'content-length': '3000000' } }), context)).status).toBe(413);
  });
  it('serves private images without caching', async () => {
    mocks.read.mockResolvedValue({ blob: new Blob(['png'], { type: 'image/png' }) });
    const response = await GET(new Request('http://localhost'), context);
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(response.headers.get('content-type')).toBe('image/png');
  });
});

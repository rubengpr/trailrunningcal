import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportFixture } from '@/tests/fixtures/blog-export';
const mocks = vi.hoisted(() => ({ get: vi.fn(), download: vi.fn(), publish: vi.fn(), url: vi.fn() }));
vi.mock('@/lib/db/blog-drafts', () => ({ getDraft: mocks.get }));
vi.mock('@/lib/db/blog-export', () => ({ downloadImage: mocks.download, publishImage: mocks.publish, publicUrl: mocks.url }));
import { exportDraft } from './blog-export';
beforeEach(async () => {
  vi.resetAllMocks(); mocks.get.mockResolvedValue(exportFixture);
  const bytes = await sharp({ create: { width: 8, height: 6, channels: 3, background: 'red' } }).png().toBuffer();
  mocks.download.mockResolvedValue(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
  mocks.url.mockImplementation(path => `https://example.com/${path}`);
});
describe('export orchestration', () => {
  it('prepares immutable paths and repeats deterministically', async () => {
    const a = await exportDraft(exportFixture.id), b = await exportDraft(exportFixture.id);
    expect(a).toEqual(b); expect(mocks.publish.mock.calls[0][0].path).toMatch(/\/[a-f0-9]{64}\.png$/);
  });
  it('does not expose images when validation or decoding fails', async () => {
    mocks.get.mockResolvedValueOnce(null); await expect(exportDraft(exportFixture.id)).rejects.toMatchObject({ status: 404 });
    mocks.get.mockResolvedValueOnce({ ...exportFixture, title: '' }); await expect(exportDraft(exportFixture.id)).rejects.toMatchObject({ status: 422 });
    mocks.download.mockResolvedValueOnce(new Blob(['invalid'])); await expect(exportDraft(exportFixture.id)).rejects.toThrow();
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('fails a partial publication and can be retried', async () => {
    mocks.get.mockResolvedValue({ ...exportFixture, articleDocument: { version: 1, blocks: [
      { id: 't', type: 'text', html: '<p>Un texto</p>' },
      { id: 'i', type: 'image', path: `${exportFixture.id}/inside.png`, alt: 'Interior', caption: '', metadata: { width: 8, height: 6, bytes: 100, format: 'png' } },
    ] } });
    mocks.publish.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Unavailable'));
    await expect(exportDraft(exportFixture.id)).rejects.toThrow('Unavailable');
    expect((await exportDraft(exportFixture.id)).filename).toBe('mejores-carreras-test.mdx');
  });
});

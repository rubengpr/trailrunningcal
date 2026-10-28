import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDocument, ImageBlock } from '@/types/blog-article-block.types';
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), upload: vi.fn(), clean: vi.fn(), download: vi.fn() }));
vi.mock('@/lib/db/blog-article-blocks', () => ({ getDocument: mocks.get, saveDocument: mocks.save }));
vi.mock('@/lib/services/blog-images', () => ({ uploadImage: mocks.upload, cleanFiles: mocks.clean }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ storage: { from: () => ({ download: mocks.download }) } }) }));
import { addImage, editImage, readImage, removeImage, replaceImage } from './blog-article-images';
const image: ImageBlock = { id: 'image', type: 'image', path: 'id/old.png', alt: 'Montaña', caption: 'Pie', metadata: { width: 10, height: 20, bytes: 100, format: 'png' } };
const document: ArticleDocument = { version: 0, blocks: [{ id: 'text-0', type: 'text', html: '<p>Texto original</p>' }, image] };
const file = new File(['png'], 'photo.png', { type: 'image/png' });
beforeEach(() => {
  vi.resetAllMocks(); mocks.get.mockResolvedValue({ status: 'completed', document: structuredClone(document) });
  mocks.upload.mockResolvedValue({ path: 'id/new.png', metadata: image.metadata });
  mocks.save.mockImplementation(async (_id, version, blocks) => ({ version: version + 1, blocks }));
});
describe('article images', () => {
  it('inserts an image and keeps all original text', async () => {
    const result = await addImage('id', file, 'text-0', 0);
    expect(result.blocks[0]).toEqual(document.blocks[0]); expect(result.blocks[1]).toMatchObject({ type: 'image', path: 'id/new.png' });
    expect(result.blocks[2]).toEqual(image);
  });
  it('rejects invalid insertion points or stale versions before uploading', async () => {
    await expect(addImage('id', file, 'missing', 0)).rejects.toMatchObject({ status: 409 });
    await expect(addImage('id', file, null, 1)).rejects.toMatchObject({ status: 409 });
    mocks.get.mockResolvedValueOnce(null);
    await expect(addImage('id', file, null, 0)).rejects.toMatchObject({ status: 404 });
    mocks.get.mockResolvedValueOnce({ status: 'running', document });
    await expect(addImage('id', file, null, 0)).rejects.toMatchObject({ status: 409 });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('compensates uploaded files after write failure or concurrent changes', async () => {
    mocks.save.mockRejectedValueOnce(new Error('DB'));
    await expect(addImage('id', file, null, 0)).rejects.toThrow('DB');
    expect(mocks.clean).toHaveBeenCalledWith(['id/new.png']);
    mocks.save.mockResolvedValueOnce(null);
    await expect(replaceImage('id', 'image', file, 0)).rejects.toMatchObject({ status: 409 });
    expect(mocks.clean).not.toHaveBeenCalledWith(['id/old.png']);
  });
  it('replaces files only after saving and clears stale alt text and caption', async () => {
    const result = await replaceImage('id', 'image', file, 0);
    expect(result.blocks[1]).toMatchObject({ id: 'image', path: 'id/new.png', alt: '', caption: '' });
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.clean.mock.invocationCallOrder[0]);
    expect(mocks.clean).toHaveBeenCalledWith(['id/old.png']);
  });
  it('edits only image text and moves only images', async () => {
    const result = await editImage('id', 'image', { action: 'update', alt: '  Cima ', caption: ' Foto ', version: 0 });
    expect(result.blocks[1]).toMatchObject({ alt: 'Cima', caption: 'Foto' }); expect(result.blocks[0]).toEqual(document.blocks[0]);
    const moved = await editImage('id', 'image', { action: 'move', direction: 'up', version: 0 });
    expect(moved.blocks.map(block => block.id)).toEqual(['image', 'text-0']); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('removes only the selected image after a successful write', async () => {
    const result = await removeImage('id', 'image', 0);
    expect(result.blocks).toEqual([document.blocks[0]]); expect(mocks.clean).toHaveBeenCalledWith(['id/old.png']);
    mocks.save.mockRejectedValueOnce(new Error('DB')); mocks.clean.mockClear();
    await expect(removeImage('id', 'image', 0)).rejects.toThrow('DB'); expect(mocks.clean).not.toHaveBeenCalled();
  });
  it('does not expose other drafts or text blocks as image files', async () => {
    await expect(readImage('id', 'other')).rejects.toMatchObject({ status: 404 });
    await expect(readImage('id', 'text-0')).rejects.toMatchObject({ status: 404 });
    expect(mocks.download).not.toHaveBeenCalled();
  });
});

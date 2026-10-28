import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), upload: vi.fn(), remove: vi.fn(), download: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/db/blog-publication', () => ({ getPublication: mocks.get, savePublication: mocks.save }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, download: mocks.download, list: mocks.list }) } }) }));
import { getImageMetadata, readImage, removeImage, saveDetails, saveImage, cleanImages } from './blog-publication';
const publication = { author: null, date: null, imagePath: 'id/old.png', imageAlt: null, version: 0 };
async function image() {
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], 'photo.png', { type: 'image/png' });
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.get.mockResolvedValue({ status: 'completed', publication });
  mocks.save.mockResolvedValue({ ...publication, imagePath: 'id/new.png', version: 1 });
  mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null });
});
describe('publication persistence', () => {
  it('clears the image and alt text before removing the file', async () => {
    mocks.save.mockResolvedValue({ ...publication, imagePath: null, imageAlt: null, version: 1 });
    await expect(removeImage('id', 0)).resolves.toMatchObject({ imagePath: null, imageAlt: null, version: 1 });
    expect(mocks.save).toHaveBeenCalledWith('id', publication, { imagePath: null, imageAlt: null });
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.remove).toHaveBeenCalledWith(['id/old.png']);
  });
  it('does not delete storage objects on conflicts or write errors', async () => {
    await expect(removeImage('id', 2)).rejects.toMatchObject({ status: 409 });
    mocks.save.mockResolvedValue(null);
    await expect(removeImage('id', 0)).rejects.toMatchObject({ status: 409 });
    mocks.save.mockRejectedValue(new Error('DB'));
    await expect(removeImage('id', 0)).rejects.toThrow('DB');
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('extracts dimensions and format from actual stored bytes', async () => {
    const file = await image();
    mocks.download.mockResolvedValue({ data: file, error: null });
    expect(await getImageMetadata('id')).toEqual({ width: 2, height: 2, bytes: file.size, format: 'png' });
  });
  it('preserves existing alternative text when only author and date are edited', async () => {
    mocks.get.mockResolvedValue({ status: 'completed', publication: { ...publication, imageAlt: 'Montserrat' } });
    await saveDetails('id', { author: 'Ruben Godoy', date: '2026-10-29', version: 0 });
    expect(mocks.save.mock.calls[0][2]).toEqual({ author: 'Ruben Godoy', date: '2026-10-29', version: 0 });
  });
  it('writes details separately without uploading or changing the article', async () => {
    await saveDetails('id', { author: 'Ruben Godoy', date: '2026-10-28', imageAlt: 'Mountain', version: 0 });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith('id', publication, { author: 'Ruben Godoy', date: '2026-10-28', imageAlt: 'Mountain', version: 0 });
  });
  it('does not call storage for missing or incomplete drafts', async () => {
    mocks.get.mockResolvedValueOnce(null);
    await expect(saveImage('id', await image(), 0)).rejects.toMatchObject({ status: 404 });
    mocks.get.mockResolvedValueOnce({ status: 'running', publication });
    await expect(saveImage('id', await image(), 0)).rejects.toMatchObject({ status: 409 });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('rejects stale edits before uploading', async () => {
    await expect(saveImage('id', await image(), 2)).rejects.toMatchObject({ status: 409 });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('validates actual bytes rather than trusting the MIME type', async () => {
    await expect(saveImage('id', new File(['bad'], 'x.png', { type: 'image/png' }), 0)).rejects.toMatchObject({ status: 422 });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('replaces the previous image only after persisting the new one', async () => {
    await saveImage('id', await image(), 0);
    expect(mocks.upload.mock.calls[0][0]).toMatch(/^id\/[a-f0-9-]+\.png$/);
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.remove).toHaveBeenCalledWith(['id/old.png']);
  });
  it('rolls back new objects on database failure', async () => {
    mocks.save.mockRejectedValue(new Error('DB'));
    await expect(saveImage('id', await image(), 0)).rejects.toThrow('DB');
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
    expect(mocks.remove).not.toHaveBeenCalledWith(['id/old.png']);
  });
  it('handles concurrent changes and deletion after upload', async () => {
    mocks.save.mockResolvedValue(null);
    await expect(saveImage('id', await image(), 0)).rejects.toMatchObject({ status: 409 });
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
    mocks.get.mockResolvedValueOnce({ status: 'completed', publication }).mockResolvedValueOnce(null);
    await expect(saveImage('id', await image(), 0)).rejects.toMatchObject({ status: 404 });
  });
  it('keeps old objects when upload fails', async () => {
    mocks.upload.mockResolvedValue({ error: new Error('storage') });
    await expect(saveImage('id', await image(), 0)).rejects.toThrow('storage');
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('does not hide successful saves on cleanup errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.remove.mockResolvedValue({ error: new Error('cleanup') });
    await expect(saveImage('id', await image(), 0)).resolves.toMatchObject({ version: 1 });
    log.mockRestore();
  });
  it('reads protected images and cleans only the draft folder', async () => {
    mocks.download.mockResolvedValue({ data: new Blob(['png'], { type: 'image/png' }), error: null });
    await readImage('id'); expect(mocks.download).toHaveBeenCalledWith('id/old.png');
    mocks.list.mockResolvedValue({ data: [{ name: 'old.png' }, { name: 'other.png' }], error: null });
    await cleanImages('id'); expect(mocks.remove).toHaveBeenCalledWith(['id/old.png', 'id/other.png']);
  });
});

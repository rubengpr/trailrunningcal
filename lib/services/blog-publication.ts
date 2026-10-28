import { cleanFiles as clean, uploadImage } from '@/lib/services/blog-images';
import sharp from 'sharp';
import { getPublication, savePublication } from '@/lib/db/blog-publication';
import { imageBucket, validateDetails } from '@/lib/blog/publication';
import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type { ImageMetadata, Publication, PublicationInput } from '@/types/blog-publication.types';

export async function requireCompleted(id: string): Promise<Publication> {
  const row = await getPublication(id);
  if (!row) throw new ValidationError('Blog draft not found', 404);
  if (row.status !== 'completed') throw new ValidationError('Article not completed', 409);
  return row.publication;
}
async function requireSaved(id: string, result: Publication | null): Promise<Publication> {
  if (result) return result;
  await requireCompleted(id);
  throw new ValidationError('publication_conflict', 409);
}
export async function saveDetails(id: string, input: PublicationInput): Promise<Publication> {
  const current = await requireCompleted(id);
  if (input.version !== current.version) throw new ValidationError('publication_conflict', 409);
  const details = validateDetails(input, !!current.imagePath);
  return requireSaved(id, await savePublication(id, current, details));
}
export async function saveImage(id: string, file: File, version: number): Promise<Publication> {
  const current = await requireCompleted(id);
  if (version !== current.version) throw new ValidationError('publication_conflict', 409);
  const { path } = await uploadImage(id, file);
  let result: Publication;
  try { result = await requireSaved(id, await savePublication(id, current, { imagePath: path, imageAlt: null })); }
  catch (error) { await clean([path]); throw error; }
  if (current.imagePath) await clean([current.imagePath]);
  return result;
}
export async function readImage(id: string): Promise<{ blob: Blob; path: string }> {
  const current = await requireCompleted(id);
  if (!current.imagePath) throw new ValidationError('Image not found', 404);
  const { data, error } = await createAdminClient().storage.from(imageBucket).download(current.imagePath);
  if (error || !data) throw new Error('Image download failed');
  return { blob: data, path: current.imagePath };
}
export async function removeImage(id: string, version: number): Promise<Publication> {
  const current = await requireCompleted(id);
  if (version !== current.version) throw new ValidationError('publication_conflict', 409);
  if (!current.imagePath) return current;
  const result = await requireSaved(id, await savePublication(id, current, { imagePath: null, imageAlt: null }));
  await clean([current.imagePath]);
  return result;
}
export async function cleanImages(id: string): Promise<void> {
  try {
    const { data, error } = await createAdminClient().storage.from(imageBucket).list(id, { limit: 1000 });
    if (error) throw error;
    await clean((data ?? []).map(file => `${id}/${file.name}`));
  } catch (error) { console.error('Blog image cleanup failed', { id, error }); }
}

export async function getImageMetadata(id: string): Promise<ImageMetadata> {
  const { blob } = await readImage(id);
  const info = await sharp(Buffer.from(await blob.arrayBuffer()), { limitInputPixels: 40_000_000 }).metadata();
  if (!info.width || !info.height || !info.format) throw new Error('Invalid image metadata');
  const rotated = [5, 6, 7, 8].includes(info.orientation ?? 1);
  return { width: rotated ? info.height : info.width, height: rotated ? info.width : info.height, bytes: blob.size, format: info.format };
}

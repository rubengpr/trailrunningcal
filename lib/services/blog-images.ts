import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { imageBucket, validateFile } from '@/lib/blog/publication';
import { createAdminClient } from '@/lib/supabase/server';
import { ValidationError } from '@/lib/errors';
import type { ImageMetadata } from '@/types/blog-publication.types';

export async function uploadImage(id: string, file: File): Promise<{ path: string; metadata: ImageMetadata }> {
  validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const formats: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
  let metadata: ImageMetadata;
  try {
    const image = sharp(buffer, { limitInputPixels: 40_000_000 });
    const info = await image.metadata();
    if (!info.width || !info.height || info.format !== formats[file.type] || (info.pages ?? 1) > 1) throw new Error('Invalid format');
    await image.stats();
    const rotated = [5, 6, 7, 8].includes(info.orientation ?? 1);
    metadata = { width: rotated ? info.height : info.width, height: rotated ? info.width : info.height, bytes: file.size, format: info.format! };
  } catch { throw new ValidationError('invalid_image', 422); }
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${id}/${randomUUID()}.${extension}`;
  const { error } = await createAdminClient().storage.from(imageBucket).upload(path, buffer, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, metadata };
}
export async function cleanFiles(paths: string[]): Promise<void> {
  if (!paths.length) return;
  try {
    const { error } = await createAdminClient().storage.from(imageBucket).remove(paths);
    if (error) throw error;
  } catch (error) { console.error('Blog image cleanup failed', { paths, error }); }
}

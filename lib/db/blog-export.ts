import { createAdminClient } from '@/lib/supabase/server';
import { imageBucket } from '@/lib/blog/publication';
import type { ExportAsset } from '@/types/blog-export.types';

export const publicationBucket = 'blog-publications';

export async function downloadImage(path: string): Promise<Blob> {
  const { data, error } = await createAdminClient().storage.from(imageBucket).download(path);
  if (error || !data) throw new Error('Export image download failed');
  return data;
}

export function publicUrl(path: string): string {
  return createAdminClient().storage.from(publicationBucket).getPublicUrl(path).data.publicUrl;
}

export async function publishImage(asset: ExportAsset): Promise<void> {
  const storage = createAdminClient().storage.from(publicationBucket);
  const { error } = await storage.upload(asset.path, asset.bytes, {
    contentType: asset.contentType, cacheControl: '31536000', upsert: false,
  });
  if (!error) return;
  // Concurrent/repeated exports must never overwrite an immutable asset.
  if (error.statusCode === '409' || error.statusCode === '400') {
    const existing = await storage.download(asset.path);
    if (existing.data && Buffer.from(await existing.data.arrayBuffer()).equals(Buffer.from(asset.bytes))) return;
  }
  throw new Error('Export image publication failed');
}

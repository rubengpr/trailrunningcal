import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { getDraft } from '@/lib/db/blog-drafts';
import { downloadImage, publicUrl, publishImage } from '@/lib/db/blog-export';
import { prepareDocument, renderDocument } from '@/lib/blog/export';
import { ValidationError } from '@/lib/errors';
import type { ExportAsset, ExportFile } from '@/types/blog-export.types';

export async function exportDraft(id: string): Promise<ExportFile> {
  const draft = await getDraft(id);
  if (!draft) throw new ValidationError('Blog draft not found', 404);
  const document = prepareDocument(draft);
  const assets: ExportAsset[] = [];
  const urls = new Map<string, string>();
  for (const path of document.paths) {
    if (!path.startsWith(`${id}/`)) throw new ValidationError('invalid_images', 422);
    const blob = await downloadImage(path);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) {
      throw new ValidationError('invalid_images', 422);
    }
    const hash = createHash('sha256').update(bytes).digest('hex');
    const target = `${id}/${hash}.${metadata.format === 'jpeg' ? 'jpg' : metadata.format}`;
    const url = publicUrl(target);
    urls.set(path, url);
    assets.push({ path: target, bytes, contentType: `image/${metadata.format}`, url });
  }
  // Compilation precedes all public writes. Retry reuses successfully copied files.
  const file = await renderDocument(draft, document.blocks, urls);
  for (const asset of assets) await publishImage(asset);
  return file;
}

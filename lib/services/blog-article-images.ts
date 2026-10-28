import { randomUUID } from 'node:crypto';
import { getDocument, saveDocument } from '@/lib/db/blog-article-blocks';
import { imageText, insertImage, moveImage } from '@/lib/blog/article-blocks';
import { cleanFiles, uploadImage } from '@/lib/services/blog-images';
import { createAdminClient } from '@/lib/supabase/server';
import { imageBucket } from '@/lib/blog/publication';
import { ValidationError } from '@/lib/errors';
import type { ArticleBlock, ArticleDocument, ImageBlock, ImageEdit } from '@/types/blog-article-block.types';

export async function requireDocument(id: string, version?: number): Promise<ArticleDocument> {
  const row = await getDocument(id);
  if (!row) throw new ValidationError('Blog draft not found', 404);
  if (row.status !== 'completed') throw new ValidationError('Article not completed', 409);
  if (version !== undefined && version !== row.document.version) throw new ValidationError('article_conflict', 409);
  return row.document;
}
function findImage(document: ArticleDocument, imageId: string): ImageBlock {
  const block = document.blocks.find(block => block.id === imageId && block.type === 'image');
  if (!block || block.type !== 'image') throw new ValidationError('Image not found', 404);
  return block;
}
async function save(id: string, version: number, blocks: ArticleBlock[]): Promise<ArticleDocument> {
  const result = await saveDocument(id, version, blocks);
  if (result) return result;
  await requireDocument(id);
  throw new ValidationError('article_conflict', 409);
}
export async function addImage(id: string, file: File, afterId: string | null, version: number): Promise<ArticleDocument> {
  const document = await requireDocument(id, version);
  // Validate the insertion point before uploading anything.
  if (afterId !== null && !document.blocks.some(block => block.id === afterId)) throw new ValidationError('article_conflict', 409);
  const uploaded = await uploadImage(id, file);
  const image: ImageBlock = { id: randomUUID(), type: 'image', ...uploaded, alt: '', caption: '' };
  try { return await save(id, version, insertImage(document.blocks, image, afterId)); }
  catch (error) { await cleanFiles([image.path]); throw error; }
}
export async function replaceImage(id: string, imageId: string, file: File, version: number): Promise<ArticleDocument> {
  const document = await requireDocument(id, version);
  const previous = findImage(document, imageId);
  const uploaded = await uploadImage(id, file);
  let result: ArticleDocument;
  try { result = await save(id, version, document.blocks.map(block => block.id === imageId ? { ...previous, ...uploaded, alt: '', caption: '' } : block)); }
  catch (error) { await cleanFiles([uploaded.path]); throw error; }
  await cleanFiles([previous.path]);
  return result;
}
export async function editImage(id: string, imageId: string, edit: ImageEdit): Promise<ArticleDocument> {
  const document = await requireDocument(id, edit.version);
  const previous = findImage(document, imageId);
  const blocks = edit.action === 'move' ? moveImage(document.blocks, imageId, edit.direction)
    : document.blocks.map(block => block.id === imageId ? { ...previous, alt: imageText(edit.alt, 300), caption: imageText(edit.caption, 500) } : block);
  return save(id, edit.version, blocks);
}
export async function removeImage(id: string, imageId: string, version: number): Promise<ArticleDocument> {
  const document = await requireDocument(id, version);
  const previous = findImage(document, imageId);
  const result = await save(id, version, document.blocks.filter(block => block.id !== imageId));
  await cleanFiles([previous.path]);
  return result;
}
export async function readImage(id: string, imageId: string): Promise<Blob> {
  const block = findImage(await requireDocument(id), imageId);
  const { data, error } = await createAdminClient().storage.from(imageBucket).download(block.path);
  if (error || !data) throw new Error('Image download failed');
  return data;
}

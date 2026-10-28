import type { ArticleDocument, ImageEdit } from '@/types/blog-article-block.types';

export class ArticleImageError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
async function read(response: Response): Promise<ArticleDocument> {
  const body = await response.json();
  if (!response.ok) throw new ArticleImageError(response.status, body.error);
  return body.data;
}
function path(id: string, imageId?: string) { return `/api/blog-drafts/${encodeURIComponent(id)}/images${imageId ? `/${encodeURIComponent(imageId)}` : ''}`; }
export function addImage(id: string, file: File, afterId: string | null, version: number): Promise<ArticleDocument> {
  const body = new FormData(); body.set('image', file); body.set('version', String(version)); body.set('afterId', afterId ?? '');
  return fetch(path(id), { method: 'POST', body }).then(read);
}
export function replaceImage(id: string, imageId: string, file: File, version: number): Promise<ArticleDocument> {
  const body = new FormData(); body.set('image', file); body.set('version', String(version));
  return fetch(path(id, imageId), { method: 'POST', body }).then(read);
}
export function editImage(id: string, imageId: string, edit: ImageEdit): Promise<ArticleDocument> {
  return fetch(path(id, imageId), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) }).then(read);
}
export function removeImage(id: string, imageId: string, version: number): Promise<ArticleDocument> {
  return fetch(`${path(id, imageId)}?version=${version}`, { method: 'DELETE' }).then(read);
}
export function imageUrl(id: string, imageId: string, version: number): string { return `${path(id, imageId)}?v=${version}`; }

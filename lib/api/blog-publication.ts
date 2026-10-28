import type { ImageMetadata, Publication, PublicationInput } from '@/types/blog-publication.types';

export class PublicationError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
async function read(response: Response): Promise<Publication> {
  const body = await response.json();
  if (!response.ok) throw new PublicationError(response.status, body.error);
  return body.data;
}
export function saveDetails(id: string, input: PublicationInput): Promise<Publication> {
  return fetch(`/api/blog-drafts/${encodeURIComponent(id)}/publication`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }).then(read);
}
export function saveImage(id: string, image: File, version: number): Promise<Publication> {
  const body = new FormData(); body.set('image', image); body.set('version', String(version));
  return fetch(`/api/blog-drafts/${encodeURIComponent(id)}/publication/image`, { method: 'POST', body }).then(read);
}
export function imageUrl(id: string, version: number): string {
  return `/api/blog-drafts/${encodeURIComponent(id)}/publication/image?v=${version}`;
}
export function removeImage(id: string, version: number): Promise<Publication> {
  return fetch(`/api/blog-drafts/${encodeURIComponent(id)}/publication/image?version=${version}`, { method: 'DELETE' }).then(read);
}

export async function getImageMetadata(id: string, signal?: AbortSignal): Promise<ImageMetadata> {
  const response = await fetch(`/api/blog-drafts/${encodeURIComponent(id)}/publication/image/metadata`, { cache: 'no-store', signal });
  const body = await response.json();
  if (!response.ok) throw new PublicationError(response.status, body.error);
  return body.data;
}

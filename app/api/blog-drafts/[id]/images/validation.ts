import { maxImageBytes } from '@/lib/blog/publication';
import { ValidationError } from '@/lib/errors';
import type { ImageEdit } from '@/types/blog-article-block.types';

export function parseVersion(value: unknown): number {
  const version = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) throw new ValidationError('Invalid version', 400);
  return version;
}
export async function parseUpload(request: Request, insertion: boolean): Promise<{ file: File; version: number; afterId: string | null }> {
  if (Number(request.headers.get('content-length')) > maxImageBytes + 65536) throw new ValidationError('image_too_large', 413);
  let form: FormData;
  try { form = await request.formData(); } catch { throw new ValidationError('Invalid request body', 400); }
  const file = form.get('image'), version = form.get('version'), afterId = form.get('afterId');
  const keys = insertion ? ['image', 'version', 'afterId'] : ['image', 'version'];
  if (!(file instanceof File) || typeof version !== 'string' || keys.some(key => form.getAll(key).length !== 1) || [...form.keys()].some(key => !keys.includes(key)) || (insertion && typeof afterId !== 'string')) throw new ValidationError('Invalid request body', 400);
  return { file, version: parseVersion(version), afterId: typeof afterId === 'string' && afterId ? afterId : null };
}
export function parseEdit(value: unknown): ImageEdit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('Invalid request body', 400);
  const body = value as Record<string, unknown>;
  const version = parseVersion(body.version);
  if (body.action === 'move' && typeof body.direction === 'string' && ['up', 'down'].includes(body.direction) && Object.keys(body).length === 3) return { action: 'move', direction: body.direction as 'up' | 'down', version };
  if (body.action === 'update' && typeof body.alt === 'string' && typeof body.caption === 'string' && Object.keys(body).length === 4) return { action: 'update', alt: body.alt, caption: body.caption, version };
  throw new ValidationError('Invalid request body', 400);
}

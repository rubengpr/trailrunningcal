import { ValidationError } from '@/lib/errors';
import type { PublicationInput } from '@/types/blog-publication.types';

export const imageBucket = 'blog-draft-images';
export const maxImageBytes = 2 * 1024 * 1024;
export const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) > 0 &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validateDetails(input: PublicationInput, hasImage: boolean): PublicationInput {
  const value = { ...input, author: input.author.trim(), ...(input.imageAlt !== undefined ? { imageAlt: input.imageAlt.trim() } : {}) };
  if (!value.author || Array.from(value.author).length > 120) throw new ValidationError('invalid_author', 422);
  if (!validDate(value.date)) throw new ValidationError('invalid_date', 422);
  if (value.imageAlt !== undefined && (Array.from(value.imageAlt).length > 300 || (hasImage && !value.imageAlt))) throw new ValidationError('invalid_alt', 422);
  return value;
}

export function validateFile(file: File): void {
  if (file.size > maxImageBytes) throw new ValidationError('image_too_large', 413);
  if (!file.size || !imageTypes.includes(file.type as typeof imageTypes[number])) throw new ValidationError('invalid_image', 422);
}

export const RACE_IMAGE_BUCKET = 'organizers';

export const ALLOWED_RACE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_RACE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const RACE_IMAGE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'] as const;

const RACE_IMAGE_BASE_FILENAME = 'main';

export function getRaceImageFilename(extension: string): string {
  return `${RACE_IMAGE_BASE_FILENAME}.${extension}`;
}

export function getVersionedRaceImageFilename(extension: string): string {
  const timestamp = Date.now();
  return `${RACE_IMAGE_BASE_FILENAME}-${timestamp}.${extension}`;
}

export function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'jpg';
}

import {
  RACE_IMAGE_BUCKET,
  RACE_IMAGE_EXTENSIONS,
  getRaceImageFilename,
} from './race-image-constants';

/**
 * Builds the public URL for a race's main image in Supabase Storage using a specific filename.
 * This is used when we know the exact filename (e.g., from the API response).
 */
export function getRaceImageUrlWithFilename(
  organizerId: string,
  raceId: string,
  filename: string,
): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return '';
  }
  const path = `${organizerId}/${raceId}/${filename}`;
  return `${base}/storage/v1/object/public/${RACE_IMAGE_BUCKET}/${path}`;
}

/**
 * Builds the public URL for a race's main image in Supabase Storage.
 * Returns the primary URL (webp preferred). The component will handle fallbacks.
 * No DB storage: we rely on UUIDs (unguessable) and server-side ownership checks
 * on upload/delete. IDs in the URL are intentional; the URL is read-only.
 * 
 * @param filename - Optional filename. If provided, uses it directly. Otherwise falls back to old behavior.
 */
export function getRaceImageUrl(
  organizerId: string,
  raceId: string,
  extension?: string,
  bustCache?: boolean,
  filename?: string,
): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return '';
  }
  
  // If filename is provided, use it directly
  if (filename) {
    const path = `${organizerId}/${raceId}/${filename}`;
    const url = `${base}/storage/v1/object/public/${RACE_IMAGE_BUCKET}/${path}`;
    return url;
  }
  
  // Fallback to old behavior (for backward compatibility)
  const ext = extension || RACE_IMAGE_EXTENSIONS[0];
  const fallbackFilename = getRaceImageFilename(ext);
  const path = `${organizerId}/${raceId}/${fallbackFilename}`;
  const url = `${base}/storage/v1/object/public/${RACE_IMAGE_BUCKET}/${path}`;

  // Add cache-busting parameter if requested
  if (bustCache) {
    return `${url}?t=${Date.now()}`;
  }

  return url;
}

/**
 * Returns all possible image URLs for a race, in order of preference.
 * Used for fallback logic when trying multiple formats.
 * 
 * @param filename - Optional filename. If provided, uses it directly. Otherwise falls back to old behavior.
 */
export function getRaceImageUrls(
  organizerId: string,
  raceId: string,
  filename?: string,
): string[] {
  // If filename is provided, use it directly (no need to try multiple extensions)
  if (filename) {
    return [getRaceImageUrlWithFilename(organizerId, raceId, filename)];
  }
  
  // Fallback to old behavior (try all extensions)
  return RACE_IMAGE_EXTENSIONS.map((ext) =>
    getRaceImageUrl(organizerId, raceId, ext),
  );
}

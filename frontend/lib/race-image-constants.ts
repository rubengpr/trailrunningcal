/**
 * Race Image Storage Configuration
 * 
 * Supabase Storage Setup Required:
 * 
 * 1. Bucket Configuration:
 *    - Bucket name: 'organizers'
 *    - Public: Yes (for read access)
 *    - File size limit: 2MB
 *    - Allowed MIME types: image/jpeg, image/png, image/webp
 * 
 * 2. Required RLS Policies:
 * 
 *    -- Allow authenticated users to upload images to their own organizer folder
 *    CREATE POLICY "Organizers can upload images"
 *    ON storage.objects FOR INSERT
 *    TO authenticated
 *    WITH CHECK (
 *      bucket_id = 'organizers' AND
 *      (storage.foldername(name))[1] IN (
 *        SELECT id::text FROM organizers WHERE owner_id = auth.uid()
 *      )
 *    );
 * 
 *    -- Allow authenticated users to update their own images
 *    CREATE POLICY "Organizers can update images"
 *    ON storage.objects FOR UPDATE
 *    TO authenticated
 *    USING (
 *      bucket_id = 'organizers' AND
 *      (storage.foldername(name))[1] IN (
 *        SELECT id::text FROM organizers WHERE owner_id = auth.uid()
 *      )
 *    );
 * 
 *    -- Allow authenticated users to delete their own images
 *    CREATE POLICY "Organizers can delete images"
 *    ON storage.objects FOR DELETE
 *    TO authenticated
 *    USING (
 *      bucket_id = 'organizers' AND
 *      (storage.foldername(name))[1] IN (
 *        SELECT id::text FROM organizers WHERE owner_id = auth.uid()
 *      )
 *    );
 * 
 *    -- Allow public read access
 *    CREATE POLICY "Public can view images"
 *    ON storage.objects FOR SELECT
 *    TO public
 *    USING (bucket_id = 'organizers');
 * 
 * 3. Storage Path Structure:
 *    organizers/{organizerId}/{raceId}/main-{timestamp}.{ext}
 *    where ext is one of: webp, jpg, jpeg, png
 *    Timestamp is milliseconds since epoch for cache invalidation
 */

export const RACE_IMAGE_BUCKET = 'organizers';

export const ALLOWED_RACE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_RACE_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/** Supported image extensions in order of preference (webp is most efficient) */
export const RACE_IMAGE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'] as const;

/** Base filename without extension */
export const RACE_IMAGE_BASE_FILENAME = 'main';

/**
 * Get the race image filename with extension
 */
export function getRaceImageFilename(extension: string): string {
  return `${RACE_IMAGE_BASE_FILENAME}.${extension}`;
}

/**
 * Get the versioned race image filename with timestamp and extension.
 * Format: main-{timestamp}.{ext}
 * This ensures each upload creates a unique URL, forcing CDN cache invalidation.
 */
export function getVersionedRaceImageFilename(extension: string): string {
  const timestamp = Date.now();
  return `${RACE_IMAGE_BASE_FILENAME}-${timestamp}.${extension}`;
}

/**
 * Extract file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'jpg';
}

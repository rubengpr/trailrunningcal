import {
  RACE_IMAGE_BUCKET,
  RACE_IMAGE_EXTENSIONS,
  getRaceImageFilename,
} from './image-constants';

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

// No DB storage: UUIDs are unguessable and upload/delete require server-side ownership checks. The URL is read-only.
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

  if (filename) {
    const path = `${organizerId}/${raceId}/${filename}`;
    return `${base}/storage/v1/object/public/${RACE_IMAGE_BUCKET}/${path}`;
  }

  const ext = extension || RACE_IMAGE_EXTENSIONS[0];
  const fallbackFilename = getRaceImageFilename(ext);
  const path = `${organizerId}/${raceId}/${fallbackFilename}`;
  const url = `${base}/storage/v1/object/public/${RACE_IMAGE_BUCKET}/${path}`;

  if (bustCache) {
    return `${url}?t=${Date.now()}`;
  }

  return url;
}

export function getRaceImageUrls(
  organizerId: string,
  raceId: string,
  filename?: string,
): string[] {
  if (filename) {
    return [getRaceImageUrlWithFilename(organizerId, raceId, filename)];
  }

  return RACE_IMAGE_EXTENSIONS.map((ext) =>
    getRaceImageUrl(organizerId, raceId, ext),
  );
}

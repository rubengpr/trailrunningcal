import type { SupabaseClient } from '@supabase/supabase-js';
import { getRaceImageUrlWithFilename } from '@/lib/races/image-url';
import {
  RACE_IMAGE_BUCKET,
  ALLOWED_RACE_IMAGE_MIME_TYPES,
  MAX_RACE_IMAGE_SIZE_BYTES,
  getRaceImageFilename,
  getVersionedRaceImageFilename,
  getExtensionFromMimeType,
  RACE_IMAGE_EXTENSIONS,
} from '@/lib/races/image-constants';
import { ValidationError } from '@/lib/errors';

type RaceImageResult =
  | { hasImage: false }
  | { hasImage: true; filename: string; imageUrl: string };

function pickFilenameFromList(files: { name: string }[]): string | null {
  const raceImageFiles = files.filter(file => {
    const isOldFormat = RACE_IMAGE_EXTENSIONS.some(ext => file.name === getRaceImageFilename(ext));
    const versionedPattern = new RegExp(`^main-\\d+\\.(${RACE_IMAGE_EXTENSIONS.join('|')})$`);
    return isOldFormat || versionedPattern.test(file.name);
  });
  if (raceImageFiles.length === 0) return null;

  const oldFormatFile = raceImageFiles.find(file =>
    RACE_IMAGE_EXTENSIONS.some(ext => file.name === getRaceImageFilename(ext)),
  );
  if (oldFormatFile) return oldFormatFile.name;

  const sorted = [...raceImageFiles].sort((a, b) => {
    const tsA = parseInt(a.name.match(/^main-(\d+)\./)?.[1] || '0', 10);
    const tsB = parseInt(b.name.match(/^main-(\d+)\./)?.[1] || '0', 10);
    return tsB - tsA;
  });
  return sorted[0]?.name ?? null;
}

export async function getRaceImage(
  supabase: SupabaseClient,
  raceId: string,
): Promise<RaceImageResult> {
  const { data: raceRow, error: raceError } = await supabase
    .from('races')
    .select('organizer_id, hero_image_filename')
    .eq('id', raceId)
    .single();

  if (raceError || !raceRow || !raceRow.organizer_id) {
    return { hasImage: false };
  }

  const organizerId = raceRow.organizer_id;
  let filename: string | null = raceRow.hero_image_filename?.trim() || null;

  if (!filename) {
    const folderPath = `${organizerId}/${raceId}`;
    const { data: files } = await supabase.storage
      .from(RACE_IMAGE_BUCKET)
      .list(folderPath);
    const picked = files?.length ? pickFilenameFromList(files) : null;
    if (picked) {
      const { error: updateError } = await supabase
        .from('races')
        .update({ hero_image_filename: picked })
        .eq('id', raceId)
        .eq('organizer_id', organizerId);
      if (updateError) {
        console.error('Race image filename recovery error:', updateError);
      }
      filename = picked;
    }
  }

  if (!filename) {
    return { hasImage: false };
  }

  const imageUrl = getRaceImageUrlWithFilename(organizerId, raceId, filename);
  return { hasImage: true, filename, imageUrl };
}

export type ImageUploadInput = {
  organizerId: string;
  raceId: string;
  existingFilename: string | null;
  file: File;
};

export function validateImageFile(file: unknown): asserts file is File {
  if (!file || !(file instanceof File)) {
    throw new ValidationError('Invalid input', 400);
  }

  if (!ALLOWED_RACE_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_RACE_IMAGE_MIME_TYPES)[number])) {
    throw new ValidationError('Invalid input', 400);
  }

  if (file.size > MAX_RACE_IMAGE_SIZE_BYTES) {
    throw new ValidationError('Invalid input', 400);
  }
}

export async function uploadRaceImage(
  supabase: SupabaseClient,
  input: ImageUploadInput,
): Promise<string> {
  const { organizerId, raceId, existingFilename, file } = input;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const extension = getExtensionFromMimeType(file.type);
  const filename = getVersionedRaceImageFilename(extension);
  const storagePath = `${organizerId}/${raceId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(RACE_IMAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error('Failed to upload image');
  }

  const { error: updateError } = await supabase
    .from('races')
    .update({ hero_image_filename: filename })
    .eq('id', raceId)
    .eq('organizer_id', organizerId);

  if (updateError) {
    console.error('DB update error:', updateError);
    const { error: rollbackError } = await supabase.storage
      .from(RACE_IMAGE_BUCKET)
      .remove([storagePath]);
    if (rollbackError) {
      console.error('Race image upload rollback error:', rollbackError);
    }
    throw new Error('Failed to update race');
  }

  if (existingFilename) {
    const previousPath = `${organizerId}/${raceId}/${existingFilename}`;
    const { error: cleanupError } = await supabase.storage
      .from(RACE_IMAGE_BUCKET)
      .remove([previousPath]);
    if (cleanupError) {
      console.error('Previous race image cleanup error:', cleanupError);
    }
  }

  return filename;
}

export async function deleteRaceImage(
  supabase: SupabaseClient,
  organizerId: string,
  raceId: string,
  existingFilename: string | null,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('races')
    .update({ hero_image_filename: null })
    .eq('id', raceId)
    .eq('organizer_id', organizerId);

  if (updateError) {
    console.error('Race image delete database error:', updateError);
    throw new Error('Failed to delete image');
  }

  if (!existingFilename) return;

  const filePath = `${organizerId}/${raceId}/${existingFilename}`;
  const { error: removeError } = await supabase.storage
    .from(RACE_IMAGE_BUCKET)
    .remove([filePath]);

  if (!removeError) return;

  console.error('Race image delete storage error:', removeError);
  const { error: restoreError } = await supabase
    .from('races')
    .update({ hero_image_filename: existingFilename })
    .eq('id', raceId)
    .eq('organizer_id', organizerId);
  if (restoreError) {
    console.error('Race image delete rollback error:', restoreError);
  }
  throw new Error('Failed to delete image');
}

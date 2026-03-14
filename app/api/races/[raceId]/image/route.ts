import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
import { getRaceImageUrlWithFilename } from '@/lib/race-image-url';
import {
  RACE_IMAGE_BUCKET,
  ALLOWED_RACE_IMAGE_MIME_TYPES,
  MAX_RACE_IMAGE_SIZE_BYTES,
  getRaceImageFilename,
  getVersionedRaceImageFilename,
  getExtensionFromMimeType,
  RACE_IMAGE_EXTENSIONS,
} from '@/lib/race-image-constants';

const FORM_FIELD_IMAGE = 'image';

function pickRaceImageFilenameFromList(
  files: { name: string }[],
): string | null {
  const raceImageFiles = files.filter(file => {
    const isOldFormat = RACE_IMAGE_EXTENSIONS.some(ext => file.name === getRaceImageFilename(ext));
    const versionedPattern = new RegExp(`^main-\\d+\\.(${RACE_IMAGE_EXTENSIONS.join('|')})$`);
    const isVersionedFormat = versionedPattern.test(file.name);
    return isOldFormat || isVersionedFormat;
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    const { data: raceRow, error: raceError } = await supabase
      .from('races')
      .select('organizer_id, hero_image_filename')
      .eq('id', raceId)
      .single();

    if (raceError || !raceRow || !raceRow.organizer_id) {
      return NextResponse.json({ hasImage: false });
    }

    const organizerId = raceRow.organizer_id;
    let filename: string | null =
      raceRow.hero_image_filename?.trim() || null;

    if (!filename) {
      const folderPath = `${organizerId}/${raceId}`;
      const { data: files } = await supabase.storage
        .from(RACE_IMAGE_BUCKET)
        .list(folderPath);
      const picked = files?.length ? pickRaceImageFilenameFromList(files) : null;
      if (picked) {
        await supabase
          .from('races')
          .update({ hero_image_filename: picked })
          .eq('id', raceId)
          .eq('organizer_id', organizerId);
        filename = picked;
      }
    }

    if (!filename) {
      return NextResponse.json({ hasImage: false });
    }

    const imageUrl = getRaceImageUrlWithFilename(organizerId, raceId, filename);
    return NextResponse.json({
      hasImage: true,
      filename,
      imageUrl,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    const organizerContext = await getOrganizerRaceContext(supabase, raceId);
    if (!organizerContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get(FORM_FIELD_IMAGE);

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 },
      );
    }

    const mimeType = file.type as string;
    if (!ALLOWED_RACE_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_RACE_IMAGE_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 },
      );
    }

    if (file.size > MAX_RACE_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extension = getExtensionFromMimeType(mimeType);
    const filename = getVersionedRaceImageFilename(extension);
    const storagePath = `${organizerContext.organizerId}/${raceId}/${filename}`;

    if (process.env.NODE_ENV === 'development') {
      console.log('Upload details:', {
        organizerId: organizerContext.organizerId,
        raceId,
        extension,
        filename,
        storagePath,
        mimeType,
        fileSize: file.size,
      });
    }

    const folderPath = `${organizerContext.organizerId}/${raceId}`;
    const existingFilename = organizerContext.race.heroImageFilename?.trim();
    if (existingFilename) {
      const filePath = `${folderPath}/${existingFilename}`;
      const { error: removeError } = await supabase.storage
        .from(RACE_IMAGE_BUCKET)
        .remove([filePath]);
      if (removeError) {
        console.error('Storage remove error:', removeError);
      }
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(RACE_IMAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to update race' },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabase
      .from('races')
      .update({ hero_image_filename: filename })
      .eq('id', raceId)
      .eq('organizer_id', organizerContext.organizerId);

    if (updateError) {
      console.error('DB update error:', updateError);
      // Rollback: remove the uploaded image to avoid orphaned files
      await supabase.storage.from(RACE_IMAGE_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to update race' },
        { status: 500 },
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Image uploaded successfully:', { path: uploadData?.path, filename });
    }

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    const organizerContext = await getOrganizerRaceContext(supabase, raceId);
    if (!organizerContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const folderPath = `${organizerContext.organizerId}/${raceId}`;
    const filename = organizerContext.race.heroImageFilename?.trim();
    if (filename) {
      const filePath = `${folderPath}/${filename}`;
      await supabase.storage.from(RACE_IMAGE_BUCKET).remove([filePath]);
    }

    await supabase
      .from('races')
      .update({ hero_image_filename: null })
      .eq('id', raceId)
      .eq('organizer_id', organizerContext.organizerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

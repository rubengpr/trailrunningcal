import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    // Try to get organizer context (for authenticated requests)
    // If not authenticated, look up the race to get organizerId (for public access)
    let organizerId: string | null = null;
    
    const organizerContext = await getOrganizerRaceContext(supabase, raceId);
    if (organizerContext) {
      organizerId = organizerContext.organizerId;
    } else {
      // Public access: look up the race to get organizerId
      const { data: raceRow, error: raceError } = await supabase
        .from('races')
        .select('organizer_id')
        .eq('id', raceId)
        .single();
      
      if (raceError || !raceRow || !raceRow.organizer_id) {
        return NextResponse.json({ hasImage: false });
      }
      
      organizerId = raceRow.organizer_id;
    }

    if (!organizerId) {
      return NextResponse.json({ hasImage: false });
    }

    const folderPath = `${organizerId}/${raceId}`;
    const { data: files } = await supabase.storage
      .from(RACE_IMAGE_BUCKET)
      .list(folderPath);

    if (!files || files.length === 0) {
      return NextResponse.json({ hasImage: false });
    }

    // Find files matching race image patterns: main.{ext} or main-{timestamp}.{ext}
    const raceImageFiles = files.filter(file => {
      // Check for old format: main.{ext}
      const isOldFormat = RACE_IMAGE_EXTENSIONS.some(ext => file.name === getRaceImageFilename(ext));
      
      // Check for new versioned format: main-{timestamp}.{ext}
      const versionedPattern = new RegExp(`^main-\\d+\\.(${RACE_IMAGE_EXTENSIONS.join('|')})$`);
      const isVersionedFormat = versionedPattern.test(file.name);
      
      return isOldFormat || isVersionedFormat;
    });

    if (raceImageFiles.length === 0) {
      return NextResponse.json({ hasImage: false });
    }

    // If we have versioned files, find the latest one by timestamp
    // Otherwise, use the old format file
    let imageFile = raceImageFiles.find(file => 
      RACE_IMAGE_EXTENSIONS.some(ext => file.name === getRaceImageFilename(ext))
    );

    if (!imageFile) {
      // Sort versioned files by timestamp (extracted from filename) descending
      const sortedVersionedFiles = raceImageFiles.sort((a, b) => {
        const timestampA = parseInt(a.name.match(/^main-(\d+)\./)?.[1] || '0', 10);
        const timestampB = parseInt(b.name.match(/^main-(\d+)\./)?.[1] || '0', 10);
        return timestampB - timestampA;
      });
      imageFile = sortedVersionedFiles[0];
    }

    if (!imageFile) {
      return NextResponse.json({ hasImage: false });
    }

    return NextResponse.json({ 
      hasImage: true,
      filename: imageFile.name,
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

    console.log('Upload details:', {
      organizerId: organizerContext.organizerId,
      raceId,
      extension,
      filename,
      storagePath,
      mimeType,
      fileSize: file.size,
    });

    // Delete all existing images for this race before uploading the new one
    // This ensures only one image exists and prevents accumulation of old versioned files
    const folderPath = `${organizerContext.organizerId}/${raceId}`;
    const { data: existingFiles } = await supabase.storage
      .from(RACE_IMAGE_BUCKET)
      .list(folderPath);

    if (existingFiles && existingFiles.length > 0) {
      const filePaths = existingFiles.map(file => `${folderPath}/${file.name}`);
      const { error: removeError } = await supabase.storage
        .from(RACE_IMAGE_BUCKET)
        .remove(filePaths);
      
      if (removeError) {
        console.error('Storage remove error:', removeError);
        // Continue anyway - new filename is unique
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

    console.log('Image uploaded successfully:', { path: uploadData?.path, filename });

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
    
    const { data: files } = await supabase.storage
      .from(RACE_IMAGE_BUCKET)
      .list(folderPath);

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${folderPath}/${file.name}`);
      await supabase.storage.from(RACE_IMAGE_BUCKET).remove(filePaths);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

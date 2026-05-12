import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerRaceContext } from '@/lib/auth/organizer';
import { ValidationError } from '@/lib/errors';
import {
  getRaceImage,
  uploadRaceImage,
  deleteRaceImage,
  validateImageFile,
} from '@/lib/services/race-image';

const FORM_FIELD_IMAGE = 'image';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    const result = await getRaceImage(supabase, raceId);

    return NextResponse.json({ success: true, data: result });
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
    validateImageFile(file);

    const filename = await uploadRaceImage(supabase, {
      organizerId: organizerContext.organizerId,
      raceId,
      existingFilename: organizerContext.race.heroImageFilename?.trim() || null,
      file,
    });

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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

    await deleteRaceImage(
      supabase,
      organizerContext.organizerId,
      raceId,
      organizerContext.race.heroImageFilename?.trim() || null,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

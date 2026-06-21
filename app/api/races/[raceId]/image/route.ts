import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getRaceAccessContext } from '@/lib/auth/organizer';
import { handleRouteError } from '@/lib/utils/handle-error';
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
    const { isAdmin } = await requireAuth();
    const { raceId } = await context.params;
    const supabase = isAdmin ? createAdminClient() : await createClient();
    const raceContext = await getRaceAccessContext(supabase, raceId, isAdmin);
    if (!raceContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await getRaceImage(supabase, raceId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { isAdmin } = await requireAuth();
    const { raceId } = await context.params;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    const raceContext = await getRaceAccessContext(supabase, raceId, isAdmin);
    if (!raceContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get(FORM_FIELD_IMAGE);
    validateImageFile(file);

    const filename = await uploadRaceImage(supabase, {
      organizerId: raceContext.organizerId,
      raceId,
      existingFilename: raceContext.race.heroImageFilename?.trim() || null,
      file,
    });

    return NextResponse.json({ success: true, data: { filename } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { isAdmin } = await requireAuth();
    const { raceId } = await context.params;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    const raceContext = await getRaceAccessContext(supabase, raceId, isAdmin);
    if (!raceContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteRaceImage(
      supabase,
      raceContext.organizerId,
      raceId,
      raceContext.race.heroImageFilename?.trim() || null,
    );

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleRouteError(error);
  }
}

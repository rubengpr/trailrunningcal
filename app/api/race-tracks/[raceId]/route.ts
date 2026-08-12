import { NextRequest, NextResponse } from 'next/server';
import { parseUuidParam } from '@/app/api/events/description-batches/validation';
import {
  validateAdminRaceTrackRequest,
  validateRaceTrackRequestSize,
} from '@/app/api/race-tracks/validation';
import { requireAdmin } from '@/lib/auth';
import { revalidateEventPages } from '@/lib/cache/revalidation';
import { ValidationError } from '@/lib/errors';
import { saveRaceTrack } from '@/lib/services/race-tracks';
import { handleRouteError } from '@/lib/utils/handle-error';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ raceId: string }> },
) {
  try {
    await requireAdmin();
    validateRaceTrackRequestSize(request.headers);

    const { raceId: rawRaceId } = await params;
    const raceId = parseUuidParam(rawRaceId, 'race id');
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ValidationError('Invalid input', 400);
    }

    const { file } = validateAdminRaceTrackRequest(formData);
    const data = await saveRaceTrack({
      raceId,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });

    revalidateEventPages(data.eventSlug);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

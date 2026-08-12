import { NextRequest, NextResponse } from 'next/server';
import {
  validateRaceTrackRequest,
  validateRaceTrackRequestSize,
} from '@/app/api/race-tracks/validation';
import { requireImportTrackSecret } from '@/lib/auth/race-track-import';
import { revalidateEventPages } from '@/lib/cache/revalidation';
import { ValidationError } from '@/lib/errors';
import { importRaceTrack } from '@/lib/services/race-tracks';
import { handleRouteError } from '@/lib/utils/handle-error';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    requireImportTrackSecret(request);
    validateRaceTrackRequestSize(request.headers);
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ValidationError('Invalid input', 400);
    }
    const input = validateRaceTrackRequest(formData);
    const data = await importRaceTrack({
      eventSlug: input.eventSlug,
      raceName: input.raceName,
      mode: input.mode,
      bytes: new Uint8Array(await input.file.arrayBuffer()),
    });

    if (input.mode === 'apply') {
      revalidateEventPages(input.eventSlug);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

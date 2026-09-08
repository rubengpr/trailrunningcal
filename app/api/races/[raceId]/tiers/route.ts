import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizerRaceContext } from '@/lib/auth/organizer';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/utils/handle-error';
import { revalidateEventPages, revalidateHomepages } from '@/lib/cache/revalidation';
import { updateTierPrice } from '@/lib/db/race-tiers';
import { getEventSlugForRace } from '@/lib/db/races';
import {
  assertRequestBody,
  parseJsonBody,
  parseUuidParam,
} from '@/app/api/request-validation';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { isAdmin } = await requireAuth();
    const { raceId: rawRaceId } = await context.params;
    const raceId = parseUuidParam(rawRaceId, 'race id');
    const supabase = await createClient();

    const body = await parseJsonBody(request);
    assertRequestBody(body);
    const { priceEur } = body;

    if (
      priceEur !== null &&
      (typeof priceEur !== 'number' || priceEur < 0 || priceEur > 9999)
    ) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (!isAdmin) {
      const context = await getOrganizerRaceContext(supabase, raceId);
      if (!context) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const data = await updateTierPrice(raceId, priceEur, isAdmin);

    revalidateHomepages();
    const eventSlug = await getEventSlugForRace(raceId, isAdmin);
    if (eventSlug) {
      revalidateEventPages(eventSlug);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

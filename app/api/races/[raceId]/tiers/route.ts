import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizerRaceContext } from '@/lib/auth/organizer';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/utils/handle-error';
import { revalidateEventPages, revalidateHomepages } from '@/lib/cache/revalidation';
import { updateTierPrice } from '@/lib/db/race-tiers';
import { getEventSlugForRace } from '@/lib/db/races';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const { isAdmin } = await requireAuth();
    const supabase = await createClient();

    const { priceEur } = await request.json();

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

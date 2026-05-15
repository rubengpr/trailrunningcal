import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizerRaceContext } from '@/lib/auth/organizer';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/utils/handle-error';
import { generateRaceSlug } from '@/lib/races/utils';
import { locales } from '@/i18n';
import { revalidatePath } from 'next/cache';
import { updateTierPrice } from '@/lib/db/race-tiers';
import { getRaceName } from '@/lib/db/races';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const { isAdmin } = await requireAuth();
    const supabase = await createClient();

    const { priceEur } = await request.json();

    if (typeof priceEur !== 'number' || priceEur < 0 || priceEur > 9999) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (!isAdmin) {
      const context = await getOrganizerRaceContext(supabase, raceId);
      if (!context) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const data = await updateTierPrice(raceId, priceEur, isAdmin);

    const raceName = await getRaceName(raceId, isAdmin);
    const slug = raceName ? generateRaceSlug(raceName) : null;
    for (const locale of locales) {
      revalidatePath(`/${locale}`, 'page');
      if (slug) {
        revalidatePath(`/${locale}/carrera/${slug}`, 'page');
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

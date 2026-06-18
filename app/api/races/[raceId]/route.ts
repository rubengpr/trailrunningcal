import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerRaceContext } from '@/lib/auth/organizer';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/utils/handle-error';
import {
  revalidateRacePages,
  revalidateHomepages,
  revalidateProvincePage,
  revalidateCategoryPages,
} from '@/lib/cache/revalidation';
import { sanitizeDescription } from '@/app/api/races/validation';
import { getRaceById, updateRace, deleteRace } from '@/lib/db/races';
import { normalizeRaceName } from '@/lib/races/utils';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const { isAdmin } = await requireAuth();
    const supabase = await createClient();

    const {
      date,
      name,
      distanceKm,
      elevationGainM,
      websiteUrl,
      city,
      province,
      description,
    } = await request.json();

    if (!isAdmin) {
      const organizerContext = await getOrganizerRaceContext(supabase, raceId);
      if (!organizerContext) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (
      elevationGainM !== null &&
      (typeof elevationGainM !== 'number' ||
        !Number.isInteger(elevationGainM) ||
        elevationGainM <= 0 ||
        elevationGainM >= 100000)
    ) {
      return NextResponse.json(
        { error: 'Invalid elevation gain' },
        { status: 400 },
      );
    }

    const descResult = sanitizeDescription(description);
    if (descResult.error) {
      return NextResponse.json({ error: descResult.error }, { status: 400 });
    }

    const normalizedName = normalizeRaceName(name);

    const updateFields: Record<string, unknown> = {
      date,
      name: normalizedName,
      distance_km: distanceKm,
      elevation_gain_m: elevationGainM,
      website_url: websiteUrl,
      description: descResult.value,
    };

    if (city !== undefined) updateFields.city = city;
    if (province !== undefined) updateFields.province = province;

    const existingRace = await getRaceById(raceId, isAdmin);
    const data = await updateRace(raceId, updateFields, isAdmin);

    if (existingRace?.name) {
      revalidateHomepages();
      revalidateCategoryPages({
        name: existingRace.name,
        distanceKm: existingRace.distance_km,
        elevationGainM: existingRace.elevation_gain_m,
      });
      revalidateRacePages(existingRace.name);
      if (existingRace.province) revalidateProvincePage(existingRace.province);
      if (province && province !== existingRace.province)
        revalidateProvincePage(province);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const { isAdmin } = await requireAuth();
    const supabase = await createClient();

    if (isAdmin) {
      const race = await getRaceById(raceId, true);
      await deleteRace(raceId, true);

      if (race?.name) {
        revalidateHomepages();
        revalidateCategoryPages({
          name: race.name,
          distanceKm: race.distance_km,
          elevationGainM: race.elevation_gain_m,
        });
        revalidateRacePages(race.name);
        if (race.province) revalidateProvincePage(race.province);
      }
    } else {
      const organizerContext = await getOrganizerRaceContext(supabase, raceId);
      if (!organizerContext) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await deleteRace(raceId, false, organizerContext.organizerId);

      revalidateHomepages();
      revalidateCategoryPages(organizerContext.race);
      revalidateRacePages(organizerContext.race.name);
      if (organizerContext.race.province)
        revalidateProvincePage(organizerContext.race.province);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

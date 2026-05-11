import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
import { requireAuth } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { revalidateRacePages, revalidateHomepages, revalidateProvincePage, revalidateCategoryPages } from '@/lib/revalidation';
import { sanitizeDescription } from '@/app/api/races/validation';

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

    const descResult = sanitizeDescription(description);
    if (descResult.error) {
      return NextResponse.json({ error: descResult.error }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {
      date,
      name,
      distance_km: distanceKm,
      elevation_gain_m: elevationGainM,
      website_url: websiteUrl,
      description: descResult.value,
    };

    if (city !== undefined) updateFields.city = city;
    if (province !== undefined) updateFields.province = province;

    const dbClient = isAdmin ? createAdminClient() : supabase;

    const { data: existingRace } = await dbClient
      .from('races')
      .select('name, province, distance_km, elevation_gain_m')
      .eq('id', raceId)
      .single();

    const { data, error } = await dbClient
      .from('races')
      .update(updateFields)
      .eq('id', raceId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update race' },
        { status: 500 },
      );
    }

    if (existingRace?.name) {
      revalidateHomepages();
      revalidateCategoryPages({ name: existingRace.name, distanceKm: existingRace.distance_km, elevationGainM: existingRace.elevation_gain_m });
      revalidateRacePages(existingRace.name);
      if (existingRace.province) revalidateProvincePage(existingRace.province);
      if (province && province !== existingRace.province) revalidateProvincePage(province);
    }

    return NextResponse.json({ success: true, data });
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
    const { isAdmin } = await requireAuth();
    const supabase = await createClient();

    if (isAdmin) {
      const adminClient = createAdminClient();

      const { data: race } = await adminClient
        .from('races')
        .select('name, province, distance_km, elevation_gain_m')
        .eq('id', raceId)
        .single();

      const { error } = await adminClient
        .from('races')
        .delete()
        .eq('id', raceId);

      if (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
          { error: 'Failed to delete race' },
          { status: 500 },
        );
      }

      if (race?.name) {
        revalidateHomepages();
        revalidateCategoryPages({ name: race.name, distanceKm: race.distance_km, elevationGainM: race.elevation_gain_m });
        revalidateRacePages(race.name);
        if (race.province) revalidateProvincePage(race.province);
      }
    } else {
      const organizerContext = await getOrganizerRaceContext(supabase, raceId);
      if (!organizerContext) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { error } = await supabase
        .from('races')
        .delete()
        .eq('id', raceId)
        .eq('organizer_id', organizerContext.organizerId);

      if (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
          { error: 'Failed to delete race' },
          { status: 500 },
        );
      }

      revalidateHomepages();
      revalidateCategoryPages(organizerContext.race);
      revalidateRacePages(organizerContext.race.name);
      if (organizerContext.race.province) revalidateProvincePage(organizerContext.race.province);
    }

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

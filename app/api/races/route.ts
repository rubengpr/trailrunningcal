import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { sanitizeDescription } from '@/app/api/races/validation';
import { conflictCheckResponse } from '@/app/api/races/race-url-conflict';

const MAX_RACES_PER_ORGANIZER = 5;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminEmail(user.email);

    let organizerId: string | null = null;

    if (!isAdmin) {
      const { data: organizer, error: organizerError } = await supabase
        .from('organizers')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (organizerError || !organizer) {
        return NextResponse.json(
          { error: 'Organizer not found' },
          { status: 404 },
        );
      }

      organizerId = organizer.id;

      const { count, error: countError } = await supabase
        .from('races')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', organizer.id);

      if (countError) {
        console.error('Count error:', countError);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 },
        );
      }

      if ((count ?? 0) >= MAX_RACES_PER_ORGANIZER) {
        return NextResponse.json(
          { error: 'Race limit reached. Maximum 5 races per organizer.' },
          { status: 403 },
        );
      }
    }

    const body = await request.json();
    const {
      name,
      date,
      distanceKm,
      elevationGainM,
      priceEur,
      websiteUrl,
      city,
      province,
      description,
    } = body;

    if (
      !name ||
      typeof name !== 'string' ||
      name.trim().length < 5 ||
      name.trim().length > 200
    ) {
      return NextResponse.json({ error: 'Invalid race name' }, { status: 400 });
    }
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    if (
      typeof distanceKm !== 'number' ||
      distanceKm <= 0 ||
      distanceKm >= 1000
    ) {
      return NextResponse.json({ error: 'Invalid distance' }, { status: 400 });
    }
    if (elevationGainM === null && !isAdmin) {
      return NextResponse.json(
        { error: 'Invalid elevation gain' },
        { status: 400 },
      );
    }
    if (
      elevationGainM !== null &&
      (typeof elevationGainM !== 'number' ||
        elevationGainM <= 0 ||
        elevationGainM >= 100000)
    ) {
      return NextResponse.json(
        { error: 'Invalid elevation gain' },
        { status: 400 },
      );
    }
    if (
      priceEur !== null &&
      (typeof priceEur !== 'number' ||
        !Number.isInteger(priceEur) ||
        priceEur < 0 ||
        priceEur >= 1000)
    ) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }
    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid website URL' },
        { status: 400 },
      );
    }
    try {
      new URL(websiteUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid website URL format' },
        { status: 400 },
      );
    }
    if (
      !city ||
      typeof city !== 'string' ||
      city.trim().length === 0 ||
      city.trim().length > 100
    ) {
      return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
    }
    if (
      !province ||
      typeof province !== 'string' ||
      province.trim().length === 0 ||
      province.trim().length > 100
    ) {
      return NextResponse.json({ error: 'Invalid province' }, { status: 400 });
    }

    const descResult = sanitizeDescription(description);
    if (descResult.error) {
      return NextResponse.json({ error: descResult.error }, { status: 400 });
    }

    const conflict = await conflictCheckResponse([websiteUrl]);
    if (conflict) return conflict;

    const dbClient = isAdmin ? createAdminClient() : supabase;

    const { data: newRaceId, error: createRaceError } = await dbClient.rpc(
      'create_race_with_tier',
      {
        p_name: name.trim(),
        p_date: date,
        p_distance_km: distanceKm,
        p_elevation_gain_m: elevationGainM,
        p_website_url: websiteUrl,
        p_city: city.trim(),
        p_province: province.trim(),
        p_description: descResult.value,
        p_organizer_id: organizerId,
        p_price_eur: priceEur,
      },
    );

    if (createRaceError || !newRaceId) {
      console.error('Create race transaction error:', createRaceError);
      return NextResponse.json(
        { error: 'Failed to create race' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: { id: newRaceId } },
      { status: 201 },
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

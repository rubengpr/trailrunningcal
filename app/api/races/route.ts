import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
import { isAdminEmail } from '@/lib/auth-admin';
import { generateRaceSlug } from '@/lib/race-utils';

const LOCALES = ['es', 'ca'] as const;

function revalidateHomepages() {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}`, 'page');
  }
}

function revalidateRacePages(raceName: string) {
  const slug = generateRaceSlug(raceName);
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/carrera/${slug}`, 'page');
  }
}

const MAX_RACES_PER_ORGANIZER = 5;

function sanitizeDescription(description: unknown): { value: string | null; error: string | null } {
  if (description === undefined || description === null) {
    return { value: null, error: null };
  }
  if (typeof description !== 'string') {
    return { value: null, error: 'Invalid input' };
  }
  const trimmed = description.trim();
  if (trimmed.length > 0 && (trimmed.length < 10 || trimmed.length > 2000)) {
    return { value: null, error: 'Invalid input' };
  }
  return { value: trimmed.length > 0 ? trimmed : null, error: null };
}

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
        return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
      }

      organizerId = organizer.id;

      const { count, error: countError } = await supabase
        .from('races')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', organizer.id);

      if (countError) {
        console.error('Count error:', countError);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      if ((count ?? 0) >= MAX_RACES_PER_ORGANIZER) {
        return NextResponse.json(
          { error: 'Race limit reached. Maximum 5 races per organizer.' },
          { status: 403 },
        );
      }
    }

    const body = await request.json();
    const { name, date, distanceKm, elevationGainM, priceEur, websiteUrl, city, province, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 5 || name.trim().length > 200) {
      return NextResponse.json({ error: 'Invalid race name' }, { status: 400 });
    }
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    if (typeof distanceKm !== 'number' || distanceKm <= 0 || distanceKm >= 1000) {
      return NextResponse.json({ error: 'Invalid distance' }, { status: 400 });
    }
    if (elevationGainM === null && !isAdmin) {
      return NextResponse.json({ error: 'Invalid elevation gain' }, { status: 400 });
    }
    if (elevationGainM !== null && (typeof elevationGainM !== 'number' || elevationGainM <= 0 || elevationGainM >= 100000)) {
      return NextResponse.json({ error: 'Invalid elevation gain' }, { status: 400 });
    }
    if (priceEur !== null && (typeof priceEur !== 'number' || !Number.isInteger(priceEur) || priceEur < 0 || priceEur >= 1000)) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }
    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }
    try { new URL(websiteUrl); } catch {
      return NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 });
    }
    if (!city || typeof city !== 'string' || city.trim().length === 0 || city.trim().length > 100) {
      return NextResponse.json({ error: 'Invalid city' }, { status: 400 });
    }
    if (!province || typeof province !== 'string' || province.trim().length === 0 || province.trim().length > 100) {
      return NextResponse.json({ error: 'Invalid province' }, { status: 400 });
    }

    const descResult = sanitizeDescription(description);
    if (descResult.error) {
      return NextResponse.json({ error: descResult.error }, { status: 400 });
    }

    const dbClient = isAdmin ? createAdminClient() : supabase;

    const { data: newRace, error: insertError } = await dbClient
      .from('races')
      .insert({
        name: name.trim(),
        date,
        distance_km: distanceKm,
        elevation_gain_m: elevationGainM,
        website_url: websiteUrl,
        city: city.trim(),
        province: province.trim(),
        description: descResult.value,
        organizer_id: organizerId,
      })
      .select('id')
      .single();

    if (insertError || !newRace) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create race' }, { status: 500 });
    }

    const { error: tierError } = await dbClient
      .from('race_tiers')
      .insert({ race_id: newRace.id, price_eur: priceEur });

    if (tierError) {
      console.error('Race tier insert error:', tierError);
      return NextResponse.json({ error: 'Failed to create race price' }, { status: 500 });
    }

    revalidateHomepages();

    return NextResponse.json({ success: true, data: { id: newRace.id } }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { raceId, date, name, distanceKm, elevationGainM, websiteUrl, city, province, description } =
      await request.json();

    const isAdmin = isAdminEmail(user.email);

    if (!isAdmin) {
      const context = await getOrganizerRaceContext(supabase, raceId);
      if (!context) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const descResult = sanitizeDescription(description);
    if (descResult.error) {
      return NextResponse.json({ error: descResult.error }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {
      id: raceId,
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
      .select('name')
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

    revalidateHomepages();
    if (existingRace?.name) {
      revalidateRacePages(existingRace.name);
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

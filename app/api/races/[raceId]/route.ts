import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
import { isAdminEmail } from '@/lib/auth-admin';
import { generateRaceSlug } from '@/lib/race-utils';
import { locales } from '@/i18n';

function revalidateHomepages() {
  for (const locale of locales) {
    revalidatePath(`/${locale}`, 'page');
  }
}

function revalidateRacePages(raceName: string) {
  const slug = generateRaceSlug(raceName);
  for (const locale of locales) {
    revalidatePath(`/${locale}/carrera/${slug}`, 'page');
  }
}

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, name, distanceKm, elevationGainM, websiteUrl, city, province, description } =
      await request.json();

    const isAdmin = isAdminEmail(user.email);

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
      return NextResponse.json({ error: 'Failed to update race' }, { status: 500 });
    }

    revalidateHomepages();
    if (existingRace?.name) {
      revalidateRacePages(existingRace.name);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminEmail(user.email);

    if (isAdmin) {
      const adminClient = createAdminClient();

      const { data: race } = await adminClient
        .from('races')
        .select('name')
        .eq('id', raceId)
        .single();

      const { error } = await adminClient
        .from('races')
        .delete()
        .eq('id', raceId);

      if (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete race' }, { status: 500 });
      }

      if (race?.name) {
        revalidateHomepages();
        revalidateRacePages(race.name);
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
        return NextResponse.json({ error: 'Failed to delete race' }, { status: 500 });
      }

      revalidateHomepages();
      revalidateRacePages(organizerContext.race.name);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

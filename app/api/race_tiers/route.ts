import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
import { isAdminEmail } from '@/lib/auth-admin';
import { generateRaceSlug } from '@/lib/race-utils';
import { locales } from '@/i18n';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { raceId, priceEur } = await request.json();

    if (!raceId || typeof raceId !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (typeof priceEur !== 'number' || priceEur < 0 || priceEur > 9999) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminEmail(user.email);

    if (!isAdmin) {
      const context = await getOrganizerRaceContext(supabase, raceId);
      if (!context) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const dbClient = isAdmin ? createAdminClient() : supabase;

    const { data, error } = await dbClient
      .from('race_tiers')
      .update({ price_eur: priceEur, updated_at: new Date().toISOString() })
      .eq('race_id', raceId)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update prices' },
        { status: 500 },
      );
    }

    const { data: race } = await dbClient
      .from('races')
      .select('name')
      .eq('id', raceId)
      .single();

    const slug = race?.name ? generateRaceSlug(race.name) : null;
    for (const locale of locales) {
      revalidatePath(`/${locale}`, 'page');
      if (slug) {
        revalidatePath(`/${locale}/carrera/${slug}`, 'page');
      }
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

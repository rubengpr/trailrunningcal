import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';
import { requireAuth } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { generateRaceSlug } from '@/lib/race-utils';
import { locales } from '@/i18n';

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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { raceId, priceEur } = await request.json();

    const context = await getOrganizerRaceContext(supabase, raceId);
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
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

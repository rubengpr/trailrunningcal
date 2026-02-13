import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    const { raceId, date, name, distanceKm, elevationGainM, websiteUrl } =
      await request.json();

    const { data, error } = await supabase
      .from('races')
      .update({
        id: raceId,
        date,
        name,
        distance_km: distanceKm,
        elevation_gain_m: elevationGainM,
        website_url: websiteUrl,
      })
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

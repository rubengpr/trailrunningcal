import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getOrganizerRaceContext } from '@/lib/auth-organizer';

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

    const { raceId, date, name, distanceKm, elevationGainM, websiteUrl, description } =
      await request.json();

    const context = await getOrganizerRaceContext(supabase, raceId);
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate and sanitize description if provided
    let sanitizedDescription: string | null = null;

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json(
          { error: 'Invalid input' },
          { status: 400 },
        );
      }

      const trimmedDescription = description.trim();

      // Description is optional, but if provided, must meet length requirements
      if (trimmedDescription.length > 0) {
        if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
          return NextResponse.json(
            { error: 'Invalid input' },
            { status: 400 },
          );
        }

        // Store as plain text (React will automatically escape HTML when rendering)
        // This prevents XSS while maintaining proper display
        sanitizedDescription = trimmedDescription;
      }
    }

    const { data, error } = await supabase
      .from('races')
      .update({
        id: raceId,
        date,
        name,
        distance_km: distanceKm,
        elevation_gain_m: elevationGainM,
        website_url: websiteUrl,
        description: sanitizedDescription,
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

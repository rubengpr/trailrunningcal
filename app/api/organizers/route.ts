import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { parseOrganizerInput } from './validation';

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const input = parseOrganizerInput(body);

    const { data, error } = await supabase
      .from('organizers')
      .update({
        name: input.organizationName,
        website: input.organizationWebsite,
        facebook_url: input.facebookUrl,
        instagram_url: input.instagramUrl,
        youtube_url: input.youtubeUrl,
        tiktok_url: input.tiktokUrl,
        updated_at: new Date().toISOString()
      })
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update organizer' },
        { status: 500 },
      );
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

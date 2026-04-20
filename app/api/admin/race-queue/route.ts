import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { normalizeUrl } from '@/lib/validation';
import { raceQueueRowToEntry } from '@/types/race-queue.types';
import type { RaceQueueRow } from '@/types/race-queue.types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'urlRequired' }, { status: 400 });
    }

    const normalizedUrl = normalizeUrl(url);

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ error: 'invalidUrlFormat' }, { status: 400 });
    }

    const admin = createAdminClient();

    const [raceLookup, queueLookup] = await Promise.all([
      admin.from('races').select('id').eq('website_url', normalizedUrl).maybeSingle(),
      admin.from('race_queue').select('id').eq('url', normalizedUrl).maybeSingle(),
    ]);

    if (raceLookup.error) {
      console.error('Race lookup error:', raceLookup.error);
      return NextResponse.json({ error: 'internalServerError' }, { status: 500 });
    }

    if (queueLookup.error) {
      console.error('Queue lookup error:', queueLookup.error);
      return NextResponse.json({ error: 'internalServerError' }, { status: 500 });
    }

    if (raceLookup.data) {
      return NextResponse.json({ error: 'urlAlreadyInRaces' }, { status: 409 });
    }

    if (queueLookup.data) {
      return NextResponse.json({ error: 'urlAlreadyInQueue' }, { status: 409 });
    }

    const { data: inserted, error: insertError } = await admin
      .from('race_queue')
      .insert({ url: normalizedUrl })
      .select('id, url, status, created_at, updated_at')
      .single();

    if (insertError || !inserted) {
      console.error('Race queue insert error:', insertError);
      return NextResponse.json({ error: 'failedToAddUrlToQueue' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: raceQueueRowToEntry(inserted as RaceQueueRow) },
      { status: 201 },
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'internalServerError' }, { status: 500 });
  }
}

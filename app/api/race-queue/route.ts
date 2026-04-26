import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { normalizeUrl } from '@/lib/validation';
import { raceQueueRowToEntry } from '@/types/race-queue.types';
import type { RaceQueueRow, RaceQueueEntry } from '@/types/race-queue.types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urlsRequired' }, { status: 400 });
    }

    if (urls.length > 100) {
      return NextResponse.json({ error: 'tooManyUrls' }, { status: 400 });
    }

    const admin = createAdminClient();
    const added: RaceQueueEntry[] = [];
    const skipped: { url: string; reason: string }[] = [];

    for (const rawUrl of urls) {
      if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
        continue;
      }

      const normalizedUrl = normalizeUrl(rawUrl.trim());

      try {
        new URL(normalizedUrl);
      } catch {
        skipped.push({ url: rawUrl.trim(), reason: 'invalidUrl' });
        continue;
      }

      const [raceLookup, queueLookup] = await Promise.all([
        admin.from('races').select('id').eq('website_url', normalizedUrl).maybeSingle(),
        admin.from('race_queue').select('id').eq('url', normalizedUrl).maybeSingle(),
      ]);

      if (raceLookup.error || queueLookup.error) {
        console.error('Lookup error:', raceLookup.error ?? queueLookup.error);
        skipped.push({ url: normalizedUrl, reason: 'lookupFailed' });
        continue;
      }

      if (raceLookup.data) {
        skipped.push({ url: normalizedUrl, reason: 'alreadyInRaces' });
        continue;
      }

      if (queueLookup.data) {
        skipped.push({ url: normalizedUrl, reason: 'alreadyInQueue' });
        continue;
      }

      const { data: inserted, error: insertError } = await admin
        .from('race_queue')
        .insert({ url: normalizedUrl })
        .select('id, url, status, created_at, updated_at')
        .single();

      if (insertError || !inserted) {
        console.error('Race queue insert error:', insertError);
        skipped.push({ url: normalizedUrl, reason: 'insertFailed' });
        continue;
      }

      added.push(raceQueueRowToEntry(inserted as RaceQueueRow));
    }

    return NextResponse.json(
      { success: true, data: { added, skipped } },
      { status: 201 },
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'internalServerError' }, { status: 500 });
  }
}

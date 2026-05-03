import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { normalizeUrl } from '@/lib/validation';
import { createPendingRaces } from '@/lib/services/pending-races';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'URLs are required' }, { status: 400 });
    }

    if (urls.length > 100) {
      return NextResponse.json({ error: 'Too many URLs (max 100)' }, { status: 400 });
    }

    const validUrls: string[] = [];
    const invalidSkips: { url: string; reason: string }[] = [];

    for (const raw of urls) {
      if (typeof raw !== 'string' || raw.trim().length === 0) continue;
      const normalized = normalizeUrl(raw.trim());
      try {
        new URL(normalized);
        validUrls.push(normalized);
      } catch {
        invalidSkips.push({ url: raw.trim(), reason: 'invalidUrl' });
      }
    }

    const result = await createPendingRaces(validUrls);

    return NextResponse.json({
      success: true,
      data: {
        added: result.added,
        skipped: [...invalidSkips, ...result.skipped],
      },
    }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

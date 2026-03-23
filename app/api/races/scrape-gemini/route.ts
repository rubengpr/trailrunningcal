import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { createGoogleAIClient, runGeminiTrailRaceDomainAgent } from '@/lib/agents/trail-race-scraper-gemini';
import { normalizeUrl } from '@/lib/validation';

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteUrl } = body;

    if (!websiteUrl || typeof websiteUrl !== 'string' || websiteUrl.trim().length === 0) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    const normalizedUrl = normalizeUrl(websiteUrl.trim());

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const client = createGoogleAIClient();
    const result = await runGeminiTrailRaceDomainAgent(client, normalizedUrl);

    const todayStr = new Date().toISOString().split('T')[0];
    const futureRaces = result.races.filter((race) => race.date >= todayStr);
    return NextResponse.json({ success: true, data: { races: futureRaces } });
  } catch (error) {
    console.error('Gemini scrape API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

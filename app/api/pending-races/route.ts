import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';
import { createPendingRaces } from '@/lib/services/pending-races';

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

    const result = await createPendingRaces(urls);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'internalServerError' }, { status: 500 });
  }
}

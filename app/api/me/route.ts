import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth-admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: true, data: { isAdmin: false } });
    }

    return NextResponse.json({ success: true, data: { isAdmin: isAdminEmail(user.email) } });
  } catch {
    return NextResponse.json({ success: true, data: { isAdmin: false } });
  }
}

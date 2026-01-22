import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  if (!token_hash || !type || !next) {
    redirect('/es/password-recovery')
  }

  const supabase = await createClient()

  try {
    await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    redirect(next)

  } catch {
    const nextUrl = new URL(next, request.url);
    const localeMatch = nextUrl.pathname.match(/^\/(es|ca)/);
    const locale = localeMatch ? localeMatch[1] : 'es';
    
    const cookieStore = await cookies();
    cookieStore.set('auth-error', 'invalid-token', {
      httpOnly: true,           // Not accessible via JavaScript (more secure)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',          // CSRF protection
      maxAge: 60,               // Expires in 60 seconds
      path: '/',                // Available site-wide
    })
    
    redirect(`/${locale}/password-recovery`);
  }
}
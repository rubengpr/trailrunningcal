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

  let locale = 'es';
  let redirectUrl: URL | null = null;
  if (next) {
    redirectUrl = new URL(next, request.url);
    const localeMatch = redirectUrl.pathname.match(/^\/(es|ca)/);
    if (localeMatch) {
      locale = localeMatch[1];
    }
  }

  const getErrorRedirect = () => {
    if (type === 'recovery') {
      return `/${locale}/password-recovery`;
    }
    if (type === 'email') {
      return `/${locale}/sign-up`;
    }
    // Default fallback
    return `/${locale}/login`;
  };

  const errorRedirectPath = getErrorRedirect();

  // Handle missing parameters early - redirect without error cookie
  if (!token_hash || !type || !next) {
    redirect(errorRedirectPath);
  }

  try {
    const supabase = await createClient()
    
    const { data: { user }, error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (verifyError) {
      throw verifyError;
    }

    if (!user) {
      throw new Error('User not found in verification response');
    }

    const { data: organizerData, error: organizerError } = await supabase
      .from('organizers')
      .insert({ owner_id: user.id })
      .select()
      .single();

    if (organizerError && organizerError.code !== '23505') { // 23505 is unique_violation
      console.error('Failed to create organizer:', organizerError);
      throw organizerError;
    }
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, organizer_id: organizerData.id })
      .select()
      .single();

    if (profileError && profileError.code !== '23505') { // 23505 is unique_violation
      console.error('Failed to create profile:', profileError);
      throw profileError;
    }

  } catch (error) {
    // Only set error cookie for authentication errors, not system errors
    const isAuthError = error && typeof error === 'object' && 'message' in error;
    
    try {
      const cookieStore = await cookies();
      
      // Only set cookie for actual auth errors (invalid token, expired, etc.)
      if (isAuthError) {
        cookieStore.set('auth-error', 'invalid-token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60,
          path: '/',
        });
      }
    } catch {
      // If setting cookie fails, just continue to redirect
      // Don't let cookie errors break the flow
    }
    redirect(errorRedirectPath);
  }

  // At this point, next is guaranteed to exist (validated above)
  // so redirectUrl should also exist
  if (!redirectUrl) {
    redirect(errorRedirectPath);
  }

  redirect(redirectUrl.pathname + redirectUrl.search)
}
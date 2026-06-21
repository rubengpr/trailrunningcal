import type { AuthUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { AuthError, ForbiddenError } from '@/lib/errors';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export async function requireAuth(): Promise<{ user: AuthUser; isAdmin: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError();
  }
  return { user, isAdmin: isAdminEmail(user.email) };
}

export async function requireAdmin(): Promise<void> {
  const { isAdmin } = await requireAuth();
  if (!isAdmin) {
    throw new ForbiddenError();
  }
}

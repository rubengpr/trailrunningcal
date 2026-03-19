const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Returns true if the given email is in the ADMIN_EMAILS allowlist.
 * Used to restrict admin routes to internal Trail Running Cal managers.
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

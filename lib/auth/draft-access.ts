import { createHash, timingSafeEqual } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { AuthError, ForbiddenError } from '@/lib/errors';
import type { DraftPermission } from '@/types/agent-api.types';

export async function requireDraftAccess(request: Request, permission: DraftPermission): Promise<void> {
  const authorization = request.headers.get('authorization');
  if (authorization === null) {
    await requireAdmin();
    return;
  }

  const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
  const expected = process.env.AGENT_API_TOKEN;
  if (!token || !expected) throw new AuthError();

  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(token), digest(expected))) throw new AuthError();

  const expiresAt = process.env.AGENT_API_TOKEN_EXPIRES_AT;
  if (expiresAt && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) {
    throw new AuthError();
  }

  const permissions = (process.env.AGENT_API_PERMISSIONS ?? 'read,update')
    .split(',').map((value) => value.trim());
  if (!permissions.includes(permission)) throw new ForbiddenError();
}

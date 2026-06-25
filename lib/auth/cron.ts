import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';

export function requireCronSecret(request: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new AuthError();
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    throw new AuthError();
  }
}

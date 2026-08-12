import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';

export function requireImportTrackSecret(request: NextRequest): void {
  const secret = process.env.IMPORT_TRACK_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret || !authorization) {
    throw new AuthError();
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new AuthError();
  }
}

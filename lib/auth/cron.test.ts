import { afterEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';
import { requireCronSecret } from './cron';

const originalCronSecret = process.env.CRON_SECRET;

function request(secret?: string): NextRequest {
  return new Request('http://localhost/api/cron/test', {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  }) as unknown as NextRequest;
}

afterEach(() => {
  process.env.CRON_SECRET = originalCronSecret;
});

describe('requireCronSecret', () => {
  it('rejects requests when CRON_SECRET is missing', () => {
    delete process.env.CRON_SECRET;

    expect(() => requireCronSecret(request('test-secret'))).toThrow(AuthError);
  });

  it('rejects requests with missing or invalid authorization', () => {
    process.env.CRON_SECRET = 'test-secret';

    expect(() => requireCronSecret(request())).toThrow(AuthError);
    expect(() => requireCronSecret(request('wrong-secret'))).toThrow(AuthError);
  });

  it('allows requests with matching bearer authorization', () => {
    process.env.CRON_SECRET = 'test-secret';

    expect(() => requireCronSecret(request('test-secret'))).not.toThrow();
  });
});

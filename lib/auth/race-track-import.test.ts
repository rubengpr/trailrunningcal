import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthError } from '@/lib/errors';
import { requireImportTrackSecret } from '@/lib/auth/race-track-import';

function request(secret?: string): NextRequest {
  return new NextRequest('http://localhost/api/race-tracks', {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

describe('requireImportTrackSecret', () => {
  const originalSecret = process.env.IMPORT_TRACK_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.IMPORT_TRACK_SECRET;
    else process.env.IMPORT_TRACK_SECRET = originalSecret;
  });

  it('rejects missing configuration and invalid credentials', () => {
    delete process.env.IMPORT_TRACK_SECRET;
    expect(() => requireImportTrackSecret(request('test-secret'))).toThrow(
      AuthError,
    );

    process.env.IMPORT_TRACK_SECRET = 'test-secret';
    expect(() => requireImportTrackSecret(request())).toThrow(AuthError);
    expect(() => requireImportTrackSecret(request('wrong-secret'))).toThrow(
      AuthError,
    );
  });

  it('accepts the configured bearer secret', () => {
    process.env.IMPORT_TRACK_SECRET = 'test-secret';
    expect(() => requireImportTrackSecret(request('test-secret'))).not.toThrow();
  });
});

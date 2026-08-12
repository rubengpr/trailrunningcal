import { describe, expect, it } from 'vitest';
import {
  MAX_TRACK_REQUEST_SIZE_BYTES,
  validateRaceTrackRequestSize,
} from '@/app/api/race-tracks/validation';
import { ValidationError } from '@/lib/errors';

describe('validateRaceTrackRequestSize', () => {
  it('allows absent and bounded content lengths', () => {
    expect(() => validateRaceTrackRequestSize(new Headers())).not.toThrow();
    expect(() =>
      validateRaceTrackRequestSize(
        new Headers({
          'content-length': String(MAX_TRACK_REQUEST_SIZE_BYTES),
        }),
      ),
    ).not.toThrow();
  });

  it('rejects malformed and oversized content lengths before multipart parsing', () => {
    expect(() =>
      validateRaceTrackRequestSize(new Headers({ 'content-length': 'invalid' })),
    ).toThrow(ValidationError);
    expect(() =>
      validateRaceTrackRequestSize(
        new Headers({
          'content-length': String(MAX_TRACK_REQUEST_SIZE_BYTES + 1),
        }),
      ),
    ).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 413 }),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  MAX_TRACK_REQUEST_SIZE_BYTES,
  validateAdminRaceTrackRequest,
  validateRaceTrackRequest,
  validateRaceTrackRequestSize,
} from '@/app/api/race-tracks/validation';
import { MAX_TRACK_UPLOAD_SIZE_BYTES } from '@/lib/race-tracks/limits';
import { ValidationError } from '@/lib/errors';

const RACE_ID = '11111111-1111-4111-8111-111111111111';

function trackFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  formData.set('mode', 'dry-run');
  formData.set('file', new File(['track'], 'route.gpx'));
  return formData;
}

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

describe('validateRaceTrackRequest', () => {
  it('accepts a match by eventSlug and raceName', () => {
    const input = validateRaceTrackRequest(
      trackFormData({ eventSlug: 'pedraforca-xtrail', raceName: 'Short' }),
    );

    expect(input).toMatchObject({
      eventSlug: 'pedraforca-xtrail',
      raceName: 'Short',
      raceId: undefined,
      mode: 'dry-run',
    });
  });

  it('accepts a match by raceId alone', () => {
    const input = validateRaceTrackRequest(trackFormData({ raceId: RACE_ID }));

    expect(input).toMatchObject({
      eventSlug: undefined,
      raceName: undefined,
      raceId: RACE_ID,
      mode: 'dry-run',
    });
  });

  it('rejects raceId combined with eventSlug or raceName', () => {
    expect(() =>
      validateRaceTrackRequest(
        trackFormData({ raceId: RACE_ID, eventSlug: 'pedraforca-xtrail' }),
      ),
    ).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 400 }),
    );
    expect(() =>
      validateRaceTrackRequest(
        trackFormData({ raceId: RACE_ID, raceName: 'Short' }),
      ),
    ).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 400 }),
    );
  });

  it('rejects a malformed raceId', () => {
    expect(() =>
      validateRaceTrackRequest(trackFormData({ raceId: 'not-a-uuid' })),
    ).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 400 }),
    );
  });

  it('rejects a missing raceName when raceId is absent', () => {
    expect(() =>
      validateRaceTrackRequest(trackFormData({ eventSlug: 'pedraforca-xtrail' })),
    ).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 400 }),
    );
  });
});

describe('validateAdminRaceTrackRequest', () => {
  it('accepts one non-empty GPX file', () => {
    const formData = new FormData();
    const file = new File(['track'], 'route.GPX');
    formData.set('file', file);

    expect(validateAdminRaceTrackRequest(formData)).toEqual({ file });
  });

  it('accepts gzip-compressed GPX transport', () => {
    const formData = new FormData();
    const file = new File(['compressed'], 'route.gpx.gz');
    formData.set('file', file);

    expect(validateAdminRaceTrackRequest(formData)).toEqual({ file });
  });

  it.each([
    ['missing file', null],
    ['wrong field type', 'route.gpx'],
    ['wrong extension', new File(['track'], 'route.txt')],
    ['empty file', new File([], 'route.gpx')],
  ])('rejects %s', (_label, value) => {
    const formData = new FormData();
    if (value !== null) formData.set('file', value);

    expect(() => validateAdminRaceTrackRequest(formData)).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 400 }),
    );
  });

  it('rejects extra or duplicate multipart fields', () => {
    const extraField = new FormData();
    extraField.set('file', new File(['track'], 'route.gpx'));
    extraField.set('eventSlug', 'pedraforca-xtrail');

    const duplicateFile = new FormData();
    duplicateFile.append('file', new File(['track'], 'one.gpx'));
    duplicateFile.append('file', new File(['track'], 'two.gpx'));

    expect(() => validateAdminRaceTrackRequest(extraField)).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 400 }),
    );
    expect(() => validateAdminRaceTrackRequest(duplicateFile)).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 400 }),
    );
  });

  it('rejects files over the track limit', () => {
    const formData = new FormData();
    formData.set(
      'file',
      new File([new Uint8Array(MAX_TRACK_UPLOAD_SIZE_BYTES + 1)], 'route.gpx'),
    );

    expect(() => validateAdminRaceTrackRequest(formData)).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 413 }),
    );
  });
});

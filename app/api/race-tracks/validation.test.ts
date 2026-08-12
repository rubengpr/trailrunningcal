import { describe, expect, it } from 'vitest';
import {
  MAX_TRACK_REQUEST_SIZE_BYTES,
  validateAdminRaceTrackRequest,
  validateRaceTrackRequestSize,
} from '@/app/api/race-tracks/validation';
import { MAX_TRACK_FILE_SIZE_BYTES } from '@/lib/race-tracks/limits';
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

describe('validateAdminRaceTrackRequest', () => {
  it('accepts one non-empty GPX file', () => {
    const formData = new FormData();
    const file = new File(['track'], 'route.GPX');
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
      new File([new Uint8Array(MAX_TRACK_FILE_SIZE_BYTES + 1)], 'route.gpx'),
    );

    expect(() => validateAdminRaceTrackRequest(formData)).toThrow(
      expect.objectContaining<Partial<ValidationError>>({ status: 413 }),
    );
  });
});

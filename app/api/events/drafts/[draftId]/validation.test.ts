import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/lib/errors';
import { parseDraftActionInput } from './validation';

const draftData = {
  event: {
    name: 'Trail Event',
    description: 'Event description',
    websiteUrl: 'https://example.com/event',
  },
  races: [
    {
      name: 'Trail Event - 21K',
      date: '2027-05-01',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
    },
  ],
};

describe('parseDraftActionInput', () => {
  it.each(['accept', 'reject'] as const)('accepts the %s action', (action) => {
    expect(parseDraftActionInput({ action })).toEqual({ action });
  });

  it('validates update data', () => {
    expect(
      parseDraftActionInput({ action: 'update', data: draftData }),
    ).toEqual({ action: 'update', data: draftData });
  });

  it('rejects an invalid action', () => {
    expect(() => parseDraftActionInput({ action: 'archive' })).toThrow(
      'Invalid draft action',
    );
  });

  it('rejects malformed update data', () => {
    expect(() =>
      parseDraftActionInput({ action: 'update', data: null }),
    ).toThrow(ValidationError);
  });
});

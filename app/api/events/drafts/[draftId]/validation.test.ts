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
      tiers: [
        { priceEur: 35, endsAt: '2027-01-31' },
        { priceEur: 45, endsAt: '2027-02-28' },
      ],
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

  it('normalizes legacy draft races without tiers', () => {
    const legacyData = {
      ...draftData,
      races: draftData.races.map((race) => {
        const legacyRace: Partial<typeof race> = { ...race };
        delete legacyRace.tiers;
        return legacyRace;
      }),
    };

    const parsed = parseDraftActionInput({
      action: 'update',
      data: legacyData,
    });

    expect(parsed).toMatchObject({
      action: 'update',
      data: { races: [{ tiers: [] }] },
    });
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

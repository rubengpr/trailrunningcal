import { describe, expect, it } from 'vitest';
import { parseEventInput, parseEventPatchInput } from './validation';

function body(tiers: unknown): Record<string, unknown> {
  return {
    event: {
      name: 'Trail Event',
      description: null,
      websiteUrl: 'https://example.com',
    },
    races: [{
      name: '21K',
      date: '2027-05-30',
      city: 'Barcelona',
      province: 'Barcelona',
      distanceKm: 21,
      elevationGainM: 900,
      tiers,
    }],
  };
}

describe('event race tier validation', () => {
  it('accepts no tiers, a default price, and dated tiers', () => {
    expect(parseEventInput(body([])).races[0].tiers).toEqual([]);
    expect(
      parseEventInput(body([{
        priceEur: 0,
        startsAt: null,
        endsAt: null,
      }])).races[0].tiers,
    ).toEqual([{ priceEur: 0, startsAt: null, endsAt: null }]);
    expect(
      parseEventPatchInput({
        ...body([{
          priceEur: 35,
          startsAt: '2026-09-01',
          endsAt: '2026-12-31',
        }]),
        mode: 'update-races',
      }).races[0].tiers,
    ).toEqual([{
      priceEur: 35,
      startsAt: '2026-09-01',
      endsAt: '2026-12-31',
    }]);
  });

  it('accepts five tiers and rejects six tiers', () => {
    const tier = { priceEur: 35, startsAt: null, endsAt: null };

    expect(parseEventInput(body(Array.from({ length: 5 }, () => tier))).races[0].tiers)
      .toHaveLength(5);
    expect(() => parseEventInput(body(Array.from({ length: 6 }, () => tier))))
      .toThrow('Too many tiers');
    expect(() => parseEventPatchInput({
      ...body(Array.from({ length: 6 }, () => tier)),
      mode: 'insert-races',
    })).toThrow('Too many tiers');
  });

  it.each([
    [undefined, 'Invalid tiers'],
    [{}, 'Invalid tiers'],
    [[{ startsAt: null, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: 10.5, startsAt: null, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: -1, startsAt: null, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: 10000, startsAt: null, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: 20, startsAt: '2026-09-01', endsAt: null }], 'Invalid tier date range'],
    [[{ priceEur: 20, startsAt: '2026-02-30', endsAt: '2026-03-01' }], 'Invalid tier date'],
    [[{ priceEur: 20, startsAt: '2026-12-31', endsAt: '2026-09-01' }], 'Invalid tier date range'],
  ])('rejects invalid tiers %#', (tiers, message) => {
    expect(() => parseEventInput(body(tiers))).toThrow(message);
  });
});

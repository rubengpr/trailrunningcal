import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/errors';
import { parseEventInput, parseEventPatchInput } from './validation';

type PatchMode = 'update-races' | 'insert-races';

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

function parseTiers(tiers: unknown, mode?: PatchMode) {
  if (mode) {
    return parseEventPatchInput({ ...body(tiers), mode }).races[0].tiers;
  }

  return parseEventInput(body(tiers)).races[0].tiers;
}

function expectValidationError(
  callback: () => unknown,
  message: string,
): void {
  let thrown: unknown;

  try {
    callback();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(ValidationError);
  expect(thrown).toMatchObject({ message, status: 400 });
}

describe('event race tier validation', () => {
  it('accepts no tiers and free or paid single tiers', () => {
    expect(parseTiers([])).toEqual([]);
    expect(parseTiers([{
      priceEur: 0,
      startsAt: null,
      endsAt: null,
    }])).toEqual([{ priceEur: 0, endsAt: null }]);
    expect(parseTiers([{
      priceEur: 35,
      endsAt: '2027-05-01',
    }])).toEqual([{
      priceEur: 35,
      endsAt: '2027-05-01',
    }]);
  });

  it.each<PatchMode | undefined>([
    undefined,
    'update-races',
    'insert-races',
  ])('accepts ordered deadline tiers for mode %#', (mode) => {
    expect(parseTiers([
      { priceEur: 35, endsAt: '2027-01-31' },
      { priceEur: 40, endsAt: '2027-02-28' },
    ], mode)).toEqual([
      { priceEur: 35, endsAt: '2027-01-31' },
      { priceEur: 40, endsAt: '2027-02-28' },
    ]);
  });

  it('tolerates and discards a legacy startsAt field', () => {
    expect(parseTiers([{
      priceEur: 35,
      startsAt: 'not-a-date',
      endsAt: null,
    }])).toEqual([{
      priceEur: 35,
      endsAt: null,
    }]);
  });

  it('accepts five tiers and rejects six tiers', () => {
    const tiers = Array.from({ length: 5 }, (_, index) => ({
      priceEur: 35 + index,
      endsAt: `2027-0${index + 1}-28`,
    }));

    expect(parseTiers(tiers)).toHaveLength(5);
    expectValidationError(
      () => parseTiers([
        ...tiers,
        { priceEur: 40, endsAt: '2027-06-28' },
      ], 'insert-races'),
      'Too many tiers',
    );
  });

  it.each([
    [undefined, 'Invalid tiers'],
    [{}, 'Invalid tiers'],
    [[{ startsAt: null, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: 10.5, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: -1, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: 10000, endsAt: null }], 'Invalid tier price'],
    [[{ priceEur: 20, endsAt: '2027-02-30' }], 'Invalid tier date'],
    [[
      { priceEur: 20, endsAt: '2027-01-31' },
      { priceEur: 25, endsAt: null },
    ], 'Tier deadline required'],
    [[
      { priceEur: 20, endsAt: '2027-01-31' },
      { priceEur: 25, endsAt: '2027-01-31' },
    ], 'Tier deadlines must be strictly increasing'],
    [[
      { priceEur: 20, endsAt: '2027-02-28' },
      { priceEur: 25, endsAt: '2027-01-31' },
    ], 'Tier deadlines must be strictly increasing'],
  ])('rejects invalid tiers with HTTP 400 metadata %#', (tiers, message) => {
    expectValidationError(() => parseTiers(tiers), message as string);
  });
});

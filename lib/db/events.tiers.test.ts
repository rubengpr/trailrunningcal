import { describe, expect, it } from 'vitest';
import { toTrailEventRace } from './events';

describe('toTrailEventRace tiers', () => {
  it('filters null prices and orders dated tiers chronologically', () => {
    const race = toTrailEventRace({
      id: 'race-1',
      name: 'Trail Event 21K',
      date: '2027-05-30',
      distance_km: 21,
      elevation_gain_m: 900,
      city: 'Barcelona',
      province: 'Barcelona',
      race_tiers: [
        {
          id: 'tier-final',
          price_eur: 45,
          ends_at: null,
        },
        {
          id: 'tier-null',
          price_eur: null,
          ends_at: null,
        },
        {
          id: 'tier-two',
          price_eur: 40,
          ends_at: '2027-03-31',
        },
        {
          id: 'tier-one',
          price_eur: 35,
          ends_at: '2026-12-31',
        },
      ],
    });

    expect(race.tiers).toEqual([
      {
        id: 'tier-one',
        priceEur: 35,
        endsAt: '2026-12-31',
      },
      {
        id: 'tier-two',
        priceEur: 40,
        endsAt: '2027-03-31',
      },
      {
        id: 'tier-final',
        priceEur: 45,
        endsAt: null,
      },
    ]);
  });

  it('maps public tier prices and dates without exposing editable identifiers', () => {
    const race = toTrailEventRace({
      id: 'race-1',
      name: 'Trail Event 21K',
      date: '2027-05-30',
      distance_km: 21,
      elevation_gain_m: 900,
      city: 'Barcelona',
      province: 'Barcelona',
      race_tiers: [{
        price_eur: 35,
        ends_at: '2026-12-31',
      }],
    });

    expect(race.tiers).toEqual([{
      priceEur: 35,
      endsAt: '2026-12-31',
    }]);
  });
});

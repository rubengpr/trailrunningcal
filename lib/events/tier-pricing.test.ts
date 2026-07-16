import { describe, expect, it } from 'vitest';
import type { EventRaceTier } from '@/types/event.types';
import { getMadridCalendarDate, getVisibleRaceTiers } from './tier-pricing';

function tier(priceEur: number, endsAt: string | null): EventRaceTier {
  return { endsAt, priceEur };
}

describe('getVisibleRaceTiers', () => {
  it('keeps a deadline ending today as the current tier', () => {
    expect(
      getVisibleRaceTiers(
        [tier(25, '2027-01-31'), tier(35, '2027-02-28')],
        '2027-01-31',
      ),
    ).toEqual([tier(25, '2027-01-31'), tier(35, '2027-02-28')]);
  });

  it('hides expired tiers and promotes the first remaining tier', () => {
    expect(
      getVisibleRaceTiers(
        [
          tier(25, '2027-01-31'),
          tier(35, '2027-02-28'),
          tier(45, '2027-03-31'),
        ],
        '2027-02-01',
      ),
    ).toEqual([tier(35, '2027-02-28'), tier(45, '2027-03-31')]);
  });

  it('returns nothing when every deadline has expired', () => {
    expect(
      getVisibleRaceTiers(
        [tier(25, '2027-01-31'), tier(35, '2027-02-28')],
        '2027-03-01',
      ),
    ).toEqual([]);
  });

  it('preserves a single tier independently of its deadline', () => {
    expect(
      getVisibleRaceTiers([tier(25, '2027-01-31')], '2027-03-01'),
    ).toEqual([tier(25, '2027-01-31')]);
  });

  it('does not render an invalid multi-tier schedule without every deadline', () => {
    expect(
      getVisibleRaceTiers(
        [tier(25, null), tier(35, '2027-02-28')],
        '2027-01-01',
      ),
    ).toEqual([]);
  });
});

describe('getMadridCalendarDate', () => {
  it('uses Madrid local time across a winter UTC day boundary', () => {
    expect(getMadridCalendarDate(new Date('2027-01-31T23:30:00Z'))).toBe(
      '2027-02-01',
    );
  });

  it('uses Madrid daylight-saving time across a summer UTC day boundary', () => {
    expect(getMadridCalendarDate(new Date('2027-06-30T22:30:00Z'))).toBe(
      '2027-07-01',
    );
  });
});

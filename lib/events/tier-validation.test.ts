import { describe, expect, it } from 'vitest';
import {
  validateRaceTierSchedule,
  type RaceTierScheduleInput,
} from '@/lib/events/tier-validation';

function tier(
  priceEur: number,
  endsAt: string | null = null,
): RaceTierScheduleInput {
  return { priceEur, endsAt };
}

describe('validateRaceTierSchedule', () => {
  it.each([
    { tiers: [] },
    { tiers: [tier(0)] },
    { tiers: [tier(35)] },
    { tiers: [tier(35, '2027-05-01')] },
    { tiers: [tier(35, '2027-01-31'), tier(40, '2027-02-28')] },
    { tiers: [
      tier(20, '2027-01-31'),
      tier(25, '2027-02-28'),
      tier(30, '2027-03-31'),
      tier(35, '2027-04-30'),
      tier(40, '2027-05-31'),
    ] },
  ])('accepts a valid schedule %#', ({ tiers }) => {
    expect(validateRaceTierSchedule(tiers)).toBeNull();
  });

  it.each([-1, 10.5, 10000, Number.NaN])(
    'rejects an invalid price %#',
    (price) => {
      expect(validateRaceTierSchedule([tier(price)])).toBe('tierPrice');
    },
  );

  it('rejects more than five tiers', () => {
    const tiers = Array.from({ length: 6 }, (_, index) =>
      tier(20 + index, `2027-0${index + 1}-28`),
    );

    expect(validateRaceTierSchedule(tiers)).toBe('tierLimit');
  });

  it('requires a deadline on every tier in a multiple-tier schedule', () => {
    expect(
      validateRaceTierSchedule([
        tier(35, '2027-01-31'),
        tier(40),
      ]),
    ).toBe('tierDeadlineRequired');
  });

  it('rejects impossible deadlines', () => {
    expect(validateRaceTierSchedule([tier(35, '2027-02-30')])).toBe(
      'tierDeadline',
    );
  });

  it.each([
    [tier(35, '2027-01-31'), tier(40, '2027-01-31')],
    [tier(35, '2027-02-28'), tier(40, '2027-01-31')],
  ])('rejects duplicate or descending deadlines %#', (...tiers) => {
    expect(validateRaceTierSchedule(tiers)).toBe('tierDeadlineOrder');
  });
});

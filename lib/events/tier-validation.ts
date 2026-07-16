import { MAX_RACE_TIERS } from '@/lib/events/constants';

export interface RaceTierScheduleInput {
  priceEur: number;
  endsAt: string | null;
}

export type RaceTierScheduleValidationError =
  | 'tierLimit'
  | 'tierPrice'
  | 'tierDeadlineRequired'
  | 'tierDeadline'
  | 'tierDeadlineOrder';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidRaceTierDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateRaceTierSchedule(
  tiers: readonly RaceTierScheduleInput[],
): RaceTierScheduleValidationError | null {
  if (tiers.length > MAX_RACE_TIERS) return 'tierLimit';

  for (const tier of tiers) {
    if (
      !Number.isInteger(tier.priceEur) ||
      tier.priceEur < 0 ||
      tier.priceEur > 9999
    ) {
      return 'tierPrice';
    }

    if (tier.endsAt !== null && !isValidRaceTierDate(tier.endsAt)) {
      return 'tierDeadline';
    }
  }

  if (tiers.length <= 1) return null;

  let previousDeadline: string | null = null;

  for (const tier of tiers) {
    if (tier.endsAt === null) return 'tierDeadlineRequired';
    if (previousDeadline !== null && tier.endsAt <= previousDeadline) {
      return 'tierDeadlineOrder';
    }

    previousDeadline = tier.endsAt;
  }

  return null;
}

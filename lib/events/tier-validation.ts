import { MAX_RACE_TIERS } from '@/lib/events/constants';
import { isValidIsoDate } from '@/lib/utils/date';

export { isValidIsoDate as isValidRaceTierDate } from '@/lib/utils/date';

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

    if (tier.endsAt !== null && !isValidIsoDate(tier.endsAt)) {
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

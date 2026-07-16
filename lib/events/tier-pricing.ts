import type { EventRaceTier } from '@/types/event.types';

const MADRID_TIME_ZONE = 'Europe/Madrid';

export function getMadridCalendarDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: MADRID_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type === 'day' || type === 'month' || type === 'year')
      .map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getVisibleRaceTiers(
  tiers: EventRaceTier[],
  today: string,
): EventRaceTier[] {
  if (tiers.length <= 1) return tiers;

  if (tiers.some(({ endsAt }) => endsAt === null)) return [];

  const firstVisibleIndex = tiers.findIndex(
    ({ endsAt }) => endsAt !== null && endsAt >= today,
  );

  if (firstVisibleIndex === -1) return [];

  return tiers.slice(firstVisibleIndex);
}

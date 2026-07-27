import { validateRaceTierSchedule } from '@/lib/events/tier-validation';
import type { TrailEventAgentRaceTier } from '@/types/trail-event-agent.types';

export function normalizeRaceTiers(
  value: unknown,
): TrailEventAgentRaceTier[] {
  if (!Array.isArray(value)) return [];

  const tiers: TrailEventAgentRaceTier[] = [];

  for (const item of value) {
    if (typeof item !== 'object' || item === null) return [];

    const { priceEur, endsAt } = item as Record<string, unknown>;
    if (typeof priceEur !== 'number' || !Number.isFinite(priceEur)) return [];
    if (endsAt !== null && typeof endsAt !== 'string') return [];

    tiers.push({
      priceEur: Math.round(priceEur),
      endsAt: typeof endsAt === 'string' && endsAt.trim() !== ''
        ? endsAt.trim()
        : null,
    });
  }

  return validateRaceTierSchedule(tiers) === null ? tiers : [];
}

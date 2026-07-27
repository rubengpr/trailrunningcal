import type { RaceTierRecoveryCandidate } from '@/types/race-tier-recovery.types';

const RACE_TIER_RECOVERY_INSTRUCTIONS = `
## Task

Recover registration price tiers for the listed trail races from the provided pricing evidence.

## Critical rules

- Return one entry for each listed race, using its exact raceIndex.
- Use [] when the evidence doesn't clearly associate pricing with a listed race.
- Use the general-public base price only; exclude member/federation discounts, licenses, insurance, merchandise, extras, and platform/payment fees.
- When a non-federated price includes a stated mandatory license or insurance surcharge, subtract that surcharge to obtain the general-public base price. Use the federated price only when it equals that calculated base; never include the surcharge.
- Don't use prices for child/youth races or other races that aren't listed.
- Preserve source order and return up to 5 {priceEur, endsAt} tiers.
- Use 0 only when explicitly free; otherwise round to the nearest whole euro (.5 upward).
- For one flat price, use the explicit registration closing date as endsAt; otherwise use null.
- One tier may set endsAt null. Multiple tiers require an inclusive, unique, strictly increasing YYYY-MM-DD endsAt on every row.
- When a tier deadline omits the year and race.date is known, infer it from the race date: use the race year unless the deadline would fall after the race date, then use the previous year. An omitted year alone is not ambiguity.
- When the last tier has a start date but no end date, use the stated registration closing date as endsAt; otherwise use race.date. A missing final deadline alone is not ambiguity when race.date is known.
- Never overwrite, sort, repair, or guess an unclear schedule.

## Output format

Return structured JSON with races as an array of {raceIndex, tiers}.
`.trim();

export function buildRaceTierRecoveryPrompt(
  races: RaceTierRecoveryCandidate[],
  evidence: string,
): string {
  return [
    RACE_TIER_RECOVERY_INSTRUCTIONS,
    '## Listed races',
    JSON.stringify(races, null, 2),
    '## Pricing evidence',
    evidence,
  ].join('\n\n');
}

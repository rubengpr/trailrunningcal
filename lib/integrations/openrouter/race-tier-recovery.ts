import type OpenAI from 'openai';
import { RACE_TIER_RECOVERY_JSON_SCHEMA } from '@/lib/agents/race-tier-recovery-schema';
import { normalizeRaceTiers } from '@/lib/events/tier-normalization';
import {
  mapCompletionUsageToScrapeUsage,
  type OpenRouterServiceResult,
} from '@/lib/integrations/openrouter/agents';
import { buildRaceTierRecoveryPrompt } from '@/lib/prompts/race-tier-recovery-instructions';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type {
  RaceTierRecoveryCandidate,
  RaceTierRecoveryParsed,
} from '@/types/race-tier-recovery.types';

const RECOVERY_MODEL = 'openai/gpt-5.6-terra';
const EVIDENCE_CONTEXT_LINES = 12;
const MAX_EVIDENCE_LENGTH = 12_000;
const EVIDENCE_SEPARATOR = '\n\n---\n\n';
const CURRENCY_PATTERN = /€|\bEUR\b|\beuros?\b/iu;
const PRICING_PATTERN =
  /preu|precio|tarifa|tram|tramo|inscri|registration|price/iu;

interface LineRange {
  start: number;
  end: number;
}

function mergeLineRanges(ranges: LineRange[]): LineRange[] {
  const merged: LineRange[] = [];

  for (const range of ranges) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end + 1) {
      merged.push({ ...range });
      continue;
    }

    previous.end = Math.max(previous.end, range.end);
  }

  return merged;
}

export function extractRaceTierPricingEvidence(
  markdown: string,
): string | null {
  const lines = markdown.split(/\r?\n/);
  const ranges = lines.flatMap<LineRange>((line, index) => {
    if (!CURRENCY_PATTERN.test(line)) return [];

    const start = Math.max(0, index - EVIDENCE_CONTEXT_LINES);
    const end = Math.min(lines.length - 1, index + EVIDENCE_CONTEXT_LINES);
    const context = lines.slice(start, end + 1).join('\n');

    return PRICING_PATTERN.test(context) ? [{ start, end }] : [];
  });

  if (ranges.length === 0) return null;

  const excerpts: string[] = [];
  let remainingLength = MAX_EVIDENCE_LENGTH;

  for (const range of mergeLineRanges(ranges)) {
    if (remainingLength <= 0) break;

    const excerpt = lines.slice(range.start, range.end + 1).join('\n').trim();
    if (!excerpt) continue;

    const separatorLength =
      excerpts.length > 0 ? EVIDENCE_SEPARATOR.length : 0;
    const availableLength = remainingLength - separatorLength;
    if (availableLength <= 0) break;

    excerpts.push(excerpt.slice(0, availableLength));
    remainingLength -= Math.min(excerpt.length, availableLength) +
      separatorLength;
  }

  return excerpts.length > 0 ? excerpts.join(EVIDENCE_SEPARATOR) : null;
}

export function combineOpenRouterUsage(
  primary: OpenRouterScrapeUsage | null,
  recovery: OpenRouterScrapeUsage | null,
): OpenRouterScrapeUsage | null {
  if (!primary) return recovery;
  if (!recovery) return primary;

  return {
    promptTokens: primary.promptTokens + recovery.promptTokens,
    completionTokens: primary.completionTokens + recovery.completionTokens,
    totalTokens: primary.totalTokens + recovery.totalTokens,
    reasoningTokens:
      primary.reasoningTokens !== null && recovery.reasoningTokens !== null
        ? primary.reasoningTokens + recovery.reasoningTokens
        : null,
    cost:
      primary.cost !== null && recovery.cost !== null
        ? primary.cost + recovery.cost
        : null,
  };
}

function missingRaceCandidates(
  result: OpenRouterServiceResult,
): RaceTierRecoveryCandidate[] {
  return result.races.flatMap<RaceTierRecoveryCandidate>((race, raceIndex) =>
    race.tiers.length === 0
      ? [{
          raceIndex,
          name: race.name,
          date: race.date,
          distanceKm: race.distanceKm,
        }]
      : []
  );
}

function parseRecoveryOutput(content: unknown): RaceTierRecoveryParsed | null {
  if (typeof content !== 'string') return null;

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return Array.isArray(parsed.races)
      ? (parsed as unknown as RaceTierRecoveryParsed)
      : null;
  } catch {
    return null;
  }
}

function mergeRecoveredTiers(
  result: OpenRouterServiceResult,
  parsed: RaceTierRecoveryParsed | null,
): OpenRouterServiceResult['races'] {
  if (!parsed) return result.races;

  const entriesByRaceIndex = new Map<number, unknown[]>();

  for (const entry of parsed.races) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !Number.isInteger(entry.raceIndex)
    ) {
      continue;
    }

    const entries = entriesByRaceIndex.get(entry.raceIndex) ?? [];
    entries.push(entry.tiers);
    entriesByRaceIndex.set(entry.raceIndex, entries);
  }

  return result.races.map((race, raceIndex) => {
    if (race.tiers.length > 0) return race;

    const entries = entriesByRaceIndex.get(raceIndex);
    if (entries?.length !== 1) return race;

    const tiers = normalizeRaceTiers(entries[0]);
    return tiers.length > 0 ? { ...race, tiers } : race;
  });
}

export async function recoverMissingRaceTiers(
  client: OpenAI,
  markdown: string,
  result: OpenRouterServiceResult,
): Promise<OpenRouterServiceResult> {
  const candidates = missingRaceCandidates(result);
  if (candidates.length === 0) return result;

  const evidence = extractRaceTierPricingEvidence(markdown);
  if (!evidence) return result;

  try {
    const completion = await client.chat.completions.create({
      model: RECOVERY_MODEL,
      reasoning_effort: 'low',
      messages: [
        {
          role: 'user',
          content: buildRaceTierRecoveryPrompt(candidates, evidence),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'race_tier_recovery',
          strict: true,
          schema: RACE_TIER_RECOVERY_JSON_SCHEMA as unknown as Record<
            string,
            unknown
          >,
        },
      },
    });

    const parsed = parseRecoveryOutput(completion.choices[0]?.message?.content);
    const races = mergeRecoveredTiers(result, parsed);
    const usage = combineOpenRouterUsage(
      result.usage,
      mapCompletionUsageToScrapeUsage(completion.usage),
    );

    return {
      ...result,
      races,
      usage,
      rawModelOutput: JSON.stringify({
        event: result.event,
        races,
        errorMessage: result.errorMessage,
      }),
    };
  } catch (error) {
    console.error('OpenRouter race tier recovery failed', { error });
    return result;
  }
}

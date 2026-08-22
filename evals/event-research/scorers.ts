import Ajv from 'ajv';
import { franc } from 'franc';

import { TRAIL_EVENT_AGENT_JSON_SCHEMA } from '@/lib/agents/trail-event-agent-schema';

import type {
  EventResearchMetadata,
  EventResearchResult,
  PriceTier,
  TrailEventOutput,
  TrailRace,
} from './types';

interface ScoreArgs {
  output: EventResearchResult;
  expected: unknown;
  metadata: EventResearchMetadata;
}

interface RacePair {
  expectedIndex: number;
  outputIndex: number;
}

const RACE_SET_WEIGHT = 0.5;
const RACE_FIELDS_WEIGHT = 0.5;
const EVENT_NAME_SIMILARITY_WEIGHT = 0.8;
const EVENT_NAME_CLEANLINESS_WEIGHT = 0.2;
const EVENT_NAME_SIMILARITY_THRESHOLD = 0.5;
const RACE_FIELD_WEIGHTS = {
  date: 0.3,
  distance: 0.3,
  city: 0.15,
  province: 0.15,
  elevation: 0.1,
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
const validateOutput = ajv.compile<TrailEventOutput>(
  structuredClone(TRAIL_EVENT_AGENT_JSON_SCHEMA),
);

function parseExpected(expected: unknown): unknown {
  if (typeof expected !== 'string') return expected;

  try {
    return JSON.parse(expected);
  } catch {
    return null;
  }
}

function validatedOutput(value: unknown): TrailEventOutput | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  // Historical golden rows and experiments predate GPX links. Treat their
  // absent value as the explicit `null` emitted by the current schema.
  const normalized = structuredClone(value) as Record<string, unknown>;
  if (Array.isArray(normalized.races)) {
    normalized.races = normalized.races.map((race) =>
      typeof race === 'object' && race !== null && !Array.isArray(race)
        ? { gpxDownloadUrl: null, ...race }
        : race,
    );
  }

  return validateOutput(normalized) ? normalized : null;
}

function normalizedText(value: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizedEventName(value: string): string {
  const tokens = normalizedText(value.replace(/(\d)([a-z])/giu, '$1 $2'))
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length > 1 && /^(?:[ivxlcdm]+)$/.test(tokens[0])) tokens.shift();
  return tokens.join(' ');
}

function eventNameTokens(value: string): string[] {
  return normalizedEventName(value).split(/\s+/).filter(Boolean);
}

function tokenF1(expected: string[], actual: string[]): number {
  const expectedCounts = new Map<string, number>();
  const actualCounts = new Map<string, number>();

  for (const token of expected) {
    expectedCounts.set(token, (expectedCounts.get(token) ?? 0) + 1);
  }
  for (const token of actual) {
    actualCounts.set(token, (actualCounts.get(token) ?? 0) + 1);
  }

  let matches = 0;
  for (const [token, expectedCount] of expectedCounts) {
    matches += Math.min(expectedCount, actualCounts.get(token) ?? 0);
  }

  return f1(matches, expected.length, actual.length);
}

function locationTokenPhrases(reference: TrailEventOutput): string[][] {
  const canonicalTokens = new Set(eventNameTokens(reference.event!.name));
  const values = reference.races.flatMap((race) => [race.city, race.province]);

  return [...new Set(values.map(normalizedText))]
    .map((value) => value.split(/\s+/).filter(Boolean))
    .filter(
      (tokens) =>
        tokens.length > 0 &&
        tokens.some((token) => !canonicalTokens.has(token)),
    )
    .sort((left, right) => right.length - left.length);
}

function removeAppendedLocations(
  tokens: string[],
  reference: TrailEventOutput,
): { tokens: string[]; removedLocation: boolean } {
  const phrases = locationTokenPhrases(reference);
  const remaining = [...tokens];
  let removedLocation = false;

  for (const phrase of phrases) {
    for (let index = 0; index <= remaining.length - phrase.length;) {
      const matches = phrase.every((token, offset) => remaining[index + offset] === token);
      if (!matches) {
        index += 1;
        continue;
      }

      remaining.splice(index, phrase.length);
      removedLocation = true;
    }
  }

  return { tokens: remaining, removedLocation };
}

function relativeDifference(expected: number, actual: number): number {
  if (expected === 0) return actual === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.abs(actual - expected) / Math.abs(expected);
}

function withinTenPercent(expected: number, actual: number): boolean {
  return relativeDifference(expected, actual) <= 0.1 + Number.EPSILON;
}

function f1(matches: number, expectedCount: number, outputCount: number): number {
  if (expectedCount === 0 && outputCount === 0) return 1;
  if (expectedCount === 0 || outputCount === 0 || matches === 0) return 0;

  const precision = matches / outputCount;
  const recall = matches / expectedCount;
  return (2 * precision * recall) / (precision + recall);
}

function pairRaces(expected: TrailRace[], output: TrailRace[]): RacePair[] {
  const candidates = expected.flatMap((expectedRace, expectedIndex) =>
    output.flatMap((outputRace, outputIndex) => {
      const distanceDifference = relativeDifference(
        expectedRace.distanceKm,
        outputRace.distanceKm,
      );
      return distanceDifference <= 0.1 + Number.EPSILON
        ? [{ expectedIndex, outputIndex, distanceDifference }]
        : [];
    }),
  );

  candidates.sort((left, right) => left.distanceDifference - right.distanceDifference);

  const usedExpected = new Set<number>();
  const usedOutput = new Set<number>();
  const pairs: RacePair[] = [];

  for (const candidate of candidates) {
    if (usedExpected.has(candidate.expectedIndex) || usedOutput.has(candidate.outputIndex)) {
      continue;
    }
    usedExpected.add(candidate.expectedIndex);
    usedOutput.add(candidate.outputIndex);
    pairs.push({
      expectedIndex: candidate.expectedIndex,
      outputIndex: candidate.outputIndex,
    });
  }

  return pairs;
}

function tierMatches(expected: PriceTier[], output: PriceTier[]): number {
  const candidates = expected.flatMap((expectedTier, expectedIndex) =>
    output.flatMap((outputTier, outputIndex) => {
      const priceDifference = Math.abs(expectedTier.priceEur - outputTier.priceEur);
      return priceDifference <= 2 + Number.EPSILON &&
        expectedTier.endsAt === outputTier.endsAt
        ? [{ expectedIndex, outputIndex, priceDifference }]
        : [];
    }),
  );

  candidates.sort((left, right) => left.priceDifference - right.priceDifference);
  const usedExpected = new Set<number>();
  const usedOutput = new Set<number>();
  let matches = 0;

  for (const candidate of candidates) {
    if (usedExpected.has(candidate.expectedIndex) || usedOutput.has(candidate.outputIndex)) {
      continue;
    }
    usedExpected.add(candidate.expectedIndex);
    usedOutput.add(candidate.outputIndex);
    matches += 1;
  }

  return matches;
}

function isSpanish(value: string): boolean {
  return franc(value, { only: ['spa', 'cat', 'eng', 'fra', 'por'] }) === 'spa';
}

function hasSpanishError(value: string | null): boolean {
  return value !== null &&
    value.trim().length > 0 &&
    value.trim().length <= 300 &&
    isSpanish(value);
}

function validDescription(value: string): boolean {
  const description = value.trim();
  const paragraphs = description.split(/\n\n/);
  const containsFirstPerson =
    /\b(?:yo|me|mí|conmigo|nosotros|nosotras|nuestro|nuestra|nuestros|nuestras)\b/iu.test(
      description,
    );

  return paragraphs.length === 2 &&
    paragraphs.every((paragraph) => paragraph.trim().length > 0) &&
    isSpanish(description) &&
    !containsFirstPerson;
}

function descriptionLengthScore(value: string): number {
  const length = value.trim().length;
  const deviation = length < 600 ? 600 - length : Math.max(0, length - 1000);

  return Math.max(0, 1 - Math.ceil(deviation / 20) * 0.05);
}

function scoreJsonSchema(output: EventResearchResult): number {
  return output.failure === null && validateOutput(output.result) ? 1 : 0;
}

function scoreNegativeCase(
  output: EventResearchResult,
  metadata: EventResearchMetadata,
): number {
  const result = validatedOutput(output.result);
  if (!result) return 0;

  switch (metadata.caseType) {
    case 'valid-event':
      return 1;
    case 'out-of-scope':
      return result.event !== null && result.races.length === 0 && hasSpanishError(result.errorMessage)
        ? 1
        : 0;
    case 'not-found':
      return result.event === null && result.races.length === 0 && hasSpanishError(result.errorMessage)
        ? 1
        : 0;
  }
}

function scoreEventName(output: EventResearchResult, expected: unknown): number {
  const result = validatedOutput(output.result);
  const reference = validatedOutput(parseExpected(expected));
  if (!result || !reference || result.event === null || reference.event === null) return 0;

  const { tokens, removedLocation } = removeAppendedLocations(
    eventNameTokens(result.event.name),
    reference,
  );
  const similarity = tokenF1(eventNameTokens(reference.event.name), tokens);
  if (similarity < EVENT_NAME_SIMILARITY_THRESHOLD) return 0;

  return similarity * EVENT_NAME_SIMILARITY_WEIGHT +
    (removedLocation ? 0 : EVENT_NAME_CLEANLINESS_WEIGHT);
}

function scoreRaces(output: EventResearchResult, expected: unknown): number {
  const result = validatedOutput(output.result);
  const reference = validatedOutput(parseExpected(expected));
  if (!result || !reference) return 0;

  const pairs = pairRaces(reference.races, result.races);
  const raceSetScore = f1(pairs.length, reference.races.length, result.races.length);
  if (pairs.length === 0) return raceSetScore * RACE_SET_WEIGHT;

  const matchedFieldScore = pairs.reduce((sum, { expectedIndex, outputIndex }) => {
    const expectedRace = reference.races[expectedIndex];
    const outputRace = result.races[outputIndex];
    const elevationScore =
      expectedRace.elevationGainM === null
        ? outputRace.elevationGainM === null
          ? 1
          : 0
        : outputRace.elevationGainM !== null &&
            withinTenPercent(expectedRace.elevationGainM, outputRace.elevationGainM)
          ? 1
          : 0;

    return sum +
      (expectedRace.date === outputRace.date ? RACE_FIELD_WEIGHTS.date : 0) +
      (withinTenPercent(expectedRace.distanceKm, outputRace.distanceKm)
        ? RACE_FIELD_WEIGHTS.distance
        : 0) +
      (normalizedText(expectedRace.city) === normalizedText(outputRace.city)
        ? RACE_FIELD_WEIGHTS.city
        : 0) +
      (normalizedText(expectedRace.province) === normalizedText(outputRace.province)
        ? RACE_FIELD_WEIGHTS.province
        : 0) +
      elevationScore * RACE_FIELD_WEIGHTS.elevation;
  }, 0) / pairs.length;

  return raceSetScore * RACE_SET_WEIGHT + matchedFieldScore * RACE_FIELDS_WEIGHT;
}

function scoreRaceTiers(output: EventResearchResult, expected: unknown): number {
  const result = validatedOutput(output.result);
  const reference = validatedOutput(parseExpected(expected));
  if (!result || !reference) return 0;

  const pairs = pairRaces(reference.races, result.races);
  const expectedCount = reference.races.reduce((sum, race) => sum + race.tiers.length, 0);
  const outputCount = result.races.reduce((sum, race) => sum + race.tiers.length, 0);
  const matches = pairs.reduce(
    (sum, { expectedIndex, outputIndex }) =>
      sum + tierMatches(reference.races[expectedIndex].tiers, result.races[outputIndex].tiers),
    0,
  );

  return f1(matches, expectedCount, outputCount);
}

function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function scoreGpxDownloadUrl(
  output: EventResearchResult,
  metadata: EventResearchMetadata,
): number {
  const result = validatedOutput(output.result);
  if (!result) return 0;

  // GPX links do not apply when the expected result is an error case.
  if (metadata.caseType !== 'valid-event') return 1;
  if (result.races.length === 0) return 0;

  return result.races.filter((race) => isHttpUrl(race.gpxDownloadUrl)).length /
    result.races.length;
}

function scoreDescription(
  output: EventResearchResult,
  metadata: EventResearchMetadata,
): number {
  const result = validatedOutput(output.result);
  if (!result) return 0;
  if (metadata.caseType !== 'valid-event') return 1;

  if (result.event?.description === null || result.event?.description === undefined) return 0;
  if (!validDescription(result.event.description)) return 0;

  return descriptionLengthScore(result.event.description);
}

export function json_schema({ output }: ScoreArgs): number {
  return scoreJsonSchema(output);
}

export function negative_case({ output, metadata }: ScoreArgs): number {
  return scoreNegativeCase(output, metadata);
}

export function event_name({ output, expected }: ScoreArgs): number {
  return scoreEventName(output, expected);
}

export function races({ output, expected, metadata }: ScoreArgs): number {
  // Negative cases must have no races. Their correctness is assessed by
  // `negative_case`, so race-detail scoring is non-applicable here.
  if (metadata.caseType !== 'valid-event') return 1;

  return scoreRaces(output, expected);
}

export function description({ output, metadata }: ScoreArgs): number {
  return scoreDescription(output, metadata);
}

export function race_tiers({ output, expected }: ScoreArgs): number {
  return scoreRaceTiers(output, expected);
}

export function gpx_download_url({ output, metadata }: ScoreArgs): number {
  return scoreGpxDownloadUrl(output, metadata);
}

export function overall({ output, expected, metadata }: ScoreArgs): number {
  if (scoreJsonSchema(output) === 0) return 0;
  if (metadata.caseType !== 'valid-event') return scoreNegativeCase(output, metadata);

  return scoreRaces(output, expected) * 0.65 +
    scoreEventName(output, expected) * 0.1 +
    scoreDescription(output, metadata) * 0.15 +
    scoreRaceTiers(output, expected) * 0.1;
}

export const scorers = [
  json_schema,
  negative_case,
  event_name,
  races,
  description,
  race_tiers,
  gpx_download_url,
  overall,
];

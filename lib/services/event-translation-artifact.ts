import { randomUUID } from 'node:crypto';
import {
  EVENT_TRANSLATION_LOCALES,
  type EventTranslationLocale,
} from '@/types/event-translation.types';

export const EVENT_TRANSLATION_ARTIFACT_VERSION = 1;

export type EventTranslationArtifactEntry = {
  eventId: string;
  slug: string;
  locale: EventTranslationLocale;
  source: string;
  description: string;
  validation: { valid: true };
  generatedAt: string;
};

export type EventTranslationArtifactFailure = {
  eventId: string;
  slug: string;
  locale: EventTranslationLocale;
  attempts: number;
  error: string;
  lastTranslation: string | null;
};

export type EventTranslationArtifact = {
  version: typeof EVENT_TRANSLATION_ARTIFACT_VERSION;
  batchId: string;
  generatedAt: string;
  locales: EventTranslationLocale[];
  expected: number;
  entries: EventTranslationArtifactEntry[];
  failures: EventTranslationArtifactFailure[];
};

export class EventTranslationArtifactError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocale(value: unknown): value is EventTranslationLocale {
  return typeof value === 'string' && (EVENT_TRANSLATION_LOCALES as readonly string[]).includes(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new EventTranslationArtifactError(`Artifact field ${field} must be a non-empty string`);
  }
}

function parseEntry(value: unknown, index: number): EventTranslationArtifactEntry {
  if (!isRecord(value)) throw new EventTranslationArtifactError(`Artifact entry ${index} is invalid`);

  assertString(value.eventId, `entries[${index}].eventId`);
  assertString(value.slug, `entries[${index}].slug`);
  if (!isLocale(value.locale)) throw new EventTranslationArtifactError(`Artifact entry ${index} has an invalid locale`);
  assertString(value.source, `entries[${index}].source`);
  assertString(value.description, `entries[${index}].description`);
  if (!isRecord(value.validation) || value.validation.valid !== true) {
    throw new EventTranslationArtifactError(`Artifact entry ${index} is not validated`);
  }
  if (!isTimestamp(value.generatedAt)) {
    throw new EventTranslationArtifactError(`Artifact entry ${index} has an invalid timestamp`);
  }

  return {
    eventId: value.eventId,
    slug: value.slug,
    locale: value.locale,
    source: value.source,
    description: value.description,
    validation: { valid: true },
    generatedAt: value.generatedAt,
  };
}

function parseFailure(value: unknown, index: number): EventTranslationArtifactFailure {
  if (!isRecord(value)) throw new EventTranslationArtifactError(`Artifact failure ${index} is invalid`);

  assertString(value.eventId, `failures[${index}].eventId`);
  assertString(value.slug, `failures[${index}].slug`);
  if (!isLocale(value.locale)) throw new EventTranslationArtifactError(`Artifact failure ${index} has an invalid locale`);
  if (typeof value.attempts !== 'number' || !Number.isInteger(value.attempts) || value.attempts < 1) {
    throw new EventTranslationArtifactError(`Artifact failure ${index} has invalid attempts`);
  }
  assertString(value.error, `failures[${index}].error`);
  if (value.lastTranslation !== null && typeof value.lastTranslation !== 'string') {
    throw new EventTranslationArtifactError(`Artifact failure ${index} has invalid lastTranslation`);
  }

  return {
    eventId: value.eventId,
    slug: value.slug,
    locale: value.locale,
    attempts: value.attempts,
    error: value.error,
    lastTranslation: value.lastTranslation,
  };
}

export function createEventTranslationArtifact(input: {
  locales: EventTranslationLocale[];
  expected: number;
  entries: EventTranslationArtifactEntry[];
  failures: EventTranslationArtifactFailure[];
}): EventTranslationArtifact {
  return {
    version: EVENT_TRANSLATION_ARTIFACT_VERSION,
    batchId: randomUUID(),
    generatedAt: new Date().toISOString(),
    locales: input.locales,
    expected: input.expected,
    entries: input.entries,
    failures: input.failures,
  };
}

export function parseEventTranslationArtifact(value: unknown): EventTranslationArtifact {
  if (!isRecord(value)) throw new EventTranslationArtifactError('Artifact must be an object');
  if (value.version !== EVENT_TRANSLATION_ARTIFACT_VERSION) {
    throw new EventTranslationArtifactError('Artifact version is unsupported');
  }
  assertString(value.batchId, 'batchId');
  if (!isTimestamp(value.generatedAt)) throw new EventTranslationArtifactError('Artifact has an invalid timestamp');
  if (!Array.isArray(value.locales) || value.locales.length === 0 || value.locales.some((locale) => !isLocale(locale))) {
    throw new EventTranslationArtifactError('Artifact locales are invalid');
  }
  const locales = Array.from(new Set(value.locales));
  if (locales.length !== value.locales.length) {
    throw new EventTranslationArtifactError('Artifact locales contain duplicates');
  }
  if (typeof value.expected !== 'number' || !Number.isInteger(value.expected) || value.expected < 1) {
    throw new EventTranslationArtifactError('Artifact expected count is invalid');
  }
  if (!Array.isArray(value.entries) || !Array.isArray(value.failures)) {
    throw new EventTranslationArtifactError('Artifact entries or failures are invalid');
  }

  return {
    version: EVENT_TRANSLATION_ARTIFACT_VERSION,
    batchId: value.batchId,
    generatedAt: value.generatedAt,
    locales,
    expected: value.expected,
    entries: value.entries.map(parseEntry),
    failures: value.failures.map(parseFailure),
  };
}

export function assertPromotableEventTranslationArtifact(
  artifact: EventTranslationArtifact,
): void {
  if (artifact.failures.length > 0) {
    throw new EventTranslationArtifactError('Artifact contains failed translations');
  }
  if (artifact.entries.length !== artifact.expected) {
    throw new EventTranslationArtifactError('Artifact is incomplete');
  }

  const pairs = new Set<string>();
  const eventLocales = new Map<string, Set<EventTranslationLocale>>();
  for (const entry of artifact.entries) {
    const pair = `${entry.eventId}:${entry.locale}`;
    if (pairs.has(pair)) throw new EventTranslationArtifactError('Artifact contains duplicate event-locale pairs');
    pairs.add(pair);

    const locales = eventLocales.get(entry.eventId) ?? new Set<EventTranslationLocale>();
    locales.add(entry.locale);
    eventLocales.set(entry.eventId, locales);
  }

  for (const locales of eventLocales.values()) {
    if (locales.size !== artifact.locales.length || artifact.locales.some((locale) => !locales.has(locale))) {
      throw new EventTranslationArtifactError('Artifact contains incomplete event locales');
    }
  }
}

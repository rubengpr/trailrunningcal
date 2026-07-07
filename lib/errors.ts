import type { ConflictingRace } from '@/types/race.types';

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden');
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export type TimeoutSource = 'Spider Cloud' | 'Context.dev' | 'Openrouter';

export class TimeoutError extends Error {
  constructor(public readonly source: TimeoutSource) {
    super(`${source} timeout`);
  }
}

export class DuplicateRaceError extends Error {
  constructor(public readonly conflicts: ConflictingRace[]) {
    super('Duplicated race');
  }
}

export class MarkdownTooLongError extends Error {
  constructor(public readonly markdown: string) {
    super('Markdown too long');
  }
}

export class MarkdownTooShortError extends Error {
  constructor(public readonly markdown: string) {
    super('Markdown too short');
  }
}

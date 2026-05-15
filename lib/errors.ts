import type { ConflictingRace } from '@/types/race.types';

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
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

export type TimeoutSource = 'Spider Cloud' | 'Openrouter';

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

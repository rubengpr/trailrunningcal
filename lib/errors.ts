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

export class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
  }
}

export class DuplicateRaceError extends Error {
  constructor(public readonly conflicts: ConflictingRace[]) {
    super('URL conflict detected');
  }
}

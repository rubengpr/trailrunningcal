import type { ConflictingRace } from '@/types/race.types';

export class ValidationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export class DuplicateRaceError extends Error {
  constructor(public readonly conflicts: ConflictingRace[]) {
    super('URL conflict detected');
  }
}

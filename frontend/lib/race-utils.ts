import { races } from '@/data/races';
import type { TrailRace } from '@/types/race.types';

/**
 * Generates a URL-friendly slug from a race name
 * @param name - The race name
 * @returns A URL-friendly slug
 */
export function generateRaceSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[®©™]/g, '') // Remove special symbols
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Finds a race by its slug (geenrated from name)
 * @param slug - The slug of the race
 * @returns The race or null if not found
 */
export function getRaceBySlug(slug: string): TrailRace | null {
  return races.find((race) => generateRaceSlug(race.name) === slug) || null;
}

/**
 * Gets all race slugs for static generation
 * @returns Array of race slugs
 */
export function getAllRaceSlugs(): string[] {
  return races.map((race) => generateRaceSlug(race.name));
}

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
 * Finds a race by its slug (generated from name)
 * @param slug - The slug of the race
 * @returns The race or null if not found
 */
export function getRaceBySlug(
  slug: string,
  races: TrailRace[],
): TrailRace | null {
  return races.find((race) => generateRaceSlug(race.name) === slug) || null;
}

/**
 * Gets all race slugs for static generation
 * @returns Array of race slugs
 */
export function getAllRaceSlugs(races: TrailRace[]): string[] {
  return races.map((race) => generateRaceSlug(race.name));
}

/**
 * Extracts a single display price from price array
 * @param priceEur - The price value (array of price objects or null)
 * @returns A single price number or null
 */
export function getDisplayPrice(
  priceEur: TrailRace['priceEur'],
): number | null {
  if (priceEur === null || priceEur === undefined) {
    return null;
  }
  if (!Array.isArray(priceEur) || priceEur.length === 0) {
    return null;
  }
  return priceEur[0].price_eur;
}

export function formatDisplayPrice(
  priceEur: TrailRace['priceEur'] | number | null | undefined,
): string {
  if (priceEur === null || priceEur === undefined) {
    return '-';
  }

  if (typeof priceEur === 'number') {
    return `${priceEur}€`;
  }

  const displayPrice = getDisplayPrice(priceEur);
  return displayPrice === null ? '-' : `${displayPrice}€`;
}

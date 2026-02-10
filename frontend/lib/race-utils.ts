import type { TrailRace, PriceValue } from '@/types/race.types';

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
 * Extracts a single display price from PriceValue
 * For PriceTier arrays, returns the current applicable price based on today's date
 * @param priceEur - The price value (number, null, or PriceTier array)
 * @returns A single price number or null
 */
export function getDisplayPrice(priceEur: PriceValue): number | null {
  // Handle number or null directly
  if (typeof priceEur === 'number') {
    return priceEur;
  }
  if (priceEur === null) {
    return null;
  }

  // Handle PriceTier array
  if (!Array.isArray(priceEur) || priceEur.length === 0) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison

  // Find the current applicable tier
  for (const tier of priceEur) {
    // If tier has no until date (null), it's the final price
    if (tier.until === null) {
      return tier.price;
    }

    // Check if today is before or equal to the tier's until date
    const untilDate = new Date(tier.until);
    untilDate.setHours(0, 0, 0, 0);
    if (today <= untilDate) {
      return tier.price;
    }
  }

  // If all dates are in the past, return the last tier's price as fallback
  return priceEur[priceEur.length - 1].price;
}

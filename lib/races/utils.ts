import type { TrailRace } from '@/types/race.types';

export function normalizeRaceName(name: unknown): string | null {
  if (typeof name !== 'string') {
    return null;
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return /[\p{L}\p{N}]/u.test(trimmed) ? trimmed : null;
}

export function generateRaceSlug(name: string | null | undefined): string {
  if (!name) {
    return '';
  }

  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[®©™]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getRaceBySlug(
  slug: string,
  races: TrailRace[],
): TrailRace | null {
  return races.find((race) => generateRaceSlug(race.name) === slug) || null;
}

export function getAllRaceSlugs(races: TrailRace[]): string[] {
  return races.map((race) => generateRaceSlug(race.name));
}

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

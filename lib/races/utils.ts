import type { DistanceGroup } from '@/lib/constants';

export function getDistanceGroup(distanceKm: number): DistanceGroup {
  if (distanceKm < 10) return '0-10';
  if (distanceKm < 20) return '10-20';
  if (distanceKm < 30) return '20-30';
  if (distanceKm < 40) return '30-40';
  if (distanceKm < 50) return '40-50';
  return '50+';
}

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

export function isValidResultsUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

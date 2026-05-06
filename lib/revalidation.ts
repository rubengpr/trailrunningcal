import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n';
import { generateRaceSlug } from '@/lib/race-utils';

type RaceForRevalidation = { name: string; distanceKm: number; elevationGainM: number | null };

const VK_KEYWORDS = ['kilómetro vertical', 'quilòmetre vertical', 'km vertical'];
const VK_DISTANCE_MAX = 4;
const VK_ELEVATION_MIN = 600;

function getRaceCategorySlugs(race: RaceForRevalidation): string[] {
  const slugs: string[] = [];
  const lowerName = race.name.toLowerCase();

  if (race.distanceKm >= 50) slugs.push('ultra-trail');
  if (race.distanceKm >= 40 && race.distanceKm < 50) slugs.push('maraton');
  if (race.distanceKm >= 20 && race.distanceKm <= 24) slugs.push('media-maraton');
  if (['marcha', 'marxa', 'caminada'].some((kw) => lowerName.includes(kw))) slugs.push('marcha');
  if (lowerName.includes('backyard')) slugs.push('backyard');

  const hasVkKeyword =
    VK_KEYWORDS.some((kw) => lowerName.includes(kw)) ||
    lowerName.includes(' kv ') ||
    lowerName.startsWith('kv ') ||
    lowerName.endsWith(' kv');
  const hasVkRatio =
    race.distanceKm < VK_DISTANCE_MAX &&
    race.elevationGainM !== null &&
    race.elevationGainM >= VK_ELEVATION_MIN;
  if (hasVkKeyword || hasVkRatio) slugs.push('km-vertical');

  return slugs;
}

export function revalidateHomepages() {
  for (const locale of locales) {
    revalidatePath(`/${locale}`, 'page');
  }
}

export function revalidateProvincePage(province: string) {
  const slug = province.toLowerCase();
  for (const locale of locales) {
    revalidatePath(`/${locale}/provincia/${slug}`, 'page');
  }
}

export function revalidateCategoryPages(race: RaceForRevalidation) {
  const slugs = getRaceCategorySlugs(race);
  for (const locale of locales) {
    for (const slug of slugs) {
      revalidatePath(`/${locale}/${slug}`, 'page');
    }
  }
}

export function revalidateRacePages(raceName: string) {
  const slug = generateRaceSlug(raceName);
  for (const locale of locales) {
    revalidatePath(`/${locale}/carrera/${slug}`, 'page');
  }
}

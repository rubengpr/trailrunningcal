import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n';
import { getRaceCategorySlugsForRace } from '@/lib/races/race-types';
import { getTypePath } from '@/lib/races/race-types';
import { generateRaceSlug } from '@/lib/races/utils';

type RaceForRevalidation = { name: string; distanceKm: number; elevationGainM: number | null };

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
  const slugs = getRaceCategorySlugsForRace(race);
  for (const locale of locales) {
    for (const slug of slugs) {
      revalidatePath(getTypePath(locale, slug), 'page');
    }
  }
}

export function revalidateRacePages(raceName: string) {
  const slug = generateRaceSlug(raceName);
  for (const locale of locales) {
    revalidatePath(`/${locale}/carrera/${slug}`, 'page');
  }
}

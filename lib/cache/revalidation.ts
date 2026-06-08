import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n';
import { getRaceCategorySlugsForRace } from '@/lib/races/race-types';
import { getTypePath } from '@/lib/races/race-types';
import { getDestinationPath, getProvinceByDbName } from '@/lib/geography/destinations';
import { generateRaceSlug } from '@/lib/races/utils';
import type { TrailEventDetail } from '@/types/event.types';

type RaceForRevalidation = { name: string; distanceKm: number; elevationGainM: number | null };

export function revalidateHomepages() {
  for (const locale of locales) {
    revalidatePath(`/${locale}`, 'page');
  }
}

export function revalidateProvincePage(province: string) {
  const destination = getProvinceByDbName(province);

  if (!destination) {
    return;
  }

  for (const locale of locales) {
    revalidatePath(
      getDestinationPath(locale, destination.province.regionId, destination.id),
      'page',
    );
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

export function revalidateEventPages(eventSlug: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/e/${eventSlug}`, 'page');
  }
}

export function revalidateEventRelatedPages(detail: TrailEventDetail): void {
  revalidateEventPages(detail.event.slug);

  for (const race of detail.races) {
    revalidateRacePages(race.name);
    revalidateCategoryPages(race);
    if (race.province) revalidateProvincePage(race.province);
  }
}

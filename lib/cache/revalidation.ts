import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n';
import { getTypePath, RACE_CATEGORY_SLUGS } from '@/lib/races/race-types';
import {
  DESTINATION_PROVINCE_IDS,
  GEOGRAPHY,
  getDestinationPath,
  getProvinceByDbName,
} from '@/lib/geography/destinations';
import type { TrailEventDetail } from '@/types/event.types';

export function revalidateHomepages() {
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
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
    );
  }
}

export function revalidateCategoryPages() {
  for (const locale of locales) {
    for (const slug of RACE_CATEGORY_SLUGS) {
      revalidatePath(getTypePath(locale, slug));
    }
  }
}

export function revalidateDestinationPages() {
  for (const provinceId of DESTINATION_PROVINCE_IDS) {
    const province = GEOGRAPHY.provinces[provinceId];

    for (const locale of locales) {
      revalidatePath(
        getDestinationPath(locale, province.regionId, provinceId),
      );
    }
  }
}

export function revalidatePublicListingPages() {
  revalidateHomepages();
  revalidateCategoryPages();
  revalidateDestinationPages();
}

export function revalidateEventPages(eventSlug: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/e/${eventSlug}`);
  }
}

export function revalidateEventRelatedPages(detail: TrailEventDetail): void {
  revalidateEventPages(detail.event.slug);
  revalidateCategoryPages();

  for (const race of detail.races) {
    if (race.province) revalidateProvincePage(race.province);
  }
}

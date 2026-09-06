import { revalidatePath, revalidateTag } from 'next/cache';
import { locales } from '@/i18n';
import { getTypePath, RACE_CATEGORY_SLUGS } from '@/lib/races/race-types';
import {
  DESTINATION_PROVINCE_IDS,
  GEOGRAPHY,
  getDestinationPath,
  getProvinceByDbName,
  getRegionPath,
  REGION_IDS,
  type RegionId,
} from '@/lib/geography/destinations';
import type { TrailEventDetail } from '@/types/event.types';

export function revalidateHomepages() {
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
  }
}

export function revalidateRegionPage(regionId: RegionId) {
  for (const locale of locales) {
    revalidatePath(getRegionPath(locale, regionId));
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

  // The community page lists every race in its provinces.
  revalidateRegionPage(destination.province.regionId);
}

export function revalidateCategoryPages() {
  for (const locale of locales) {
    for (const slug of RACE_CATEGORY_SLUGS) {
      revalidatePath(getTypePath(locale, slug));
    }
  }
}

export function revalidateDestinationPages() {
  for (const regionId of REGION_IDS) {
    revalidateRegionPage(regionId);
  }

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

export function revalidateEventTrackRoutes(eventId: string) {
  revalidateTag(`event-track-routes:${eventId}`, 'max');
}

export function revalidateEventRelatedPages(detail: TrailEventDetail): void {
  revalidateEventPages(detail.event.slug);
  revalidateCategoryPages();

  for (const race of detail.races) {
    if (race.province) revalidateProvincePage(race.province);
  }
}

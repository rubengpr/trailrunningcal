import { revalidatePath, revalidateTag } from 'next/cache';
import { locales } from '@/i18n';
import { toPublicEventDetail } from '@/lib/events/utils';
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

type RevalidationScope =
  | 'category-pages'
  | 'destination-pages'
  | 'event-pages'
  | 'event-mutation'
  | 'event-track-routes'
  | 'homepages'
  | 'province-pages'
  | 'region-pages';

function logRevalidation(
  source: string,
  scope: RevalidationScope,
  affectedPathCount: number,
  affectedTagCount = 0,
  listingChanged?: boolean,
): void {
  console.info(JSON.stringify({
    level: 'info',
    message: 'cache_revalidation',
    source,
    scope,
    affectedPathCount,
    affectedTagCount,
    ...(listingChanged === undefined ? {} : { listingChanged }),
  }));
}

export function revalidateHomepages(source: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
  }
  logRevalidation(source, 'homepages', locales.length);
}

export function revalidateRegionPage(regionId: RegionId, source: string) {
  for (const locale of locales) {
    revalidatePath(getRegionPath(locale, regionId));
  }
  logRevalidation(source, 'region-pages', locales.length);
}

export function revalidateProvincePage(province: string, source: string) {
  const destination = getProvinceByDbName(province);

  if (!destination) {
    return;
  }

  for (const locale of locales) {
    revalidatePath(
      getDestinationPath(locale, destination.province.regionId, destination.id),
    );
  }
  logRevalidation(source, 'province-pages', locales.length);

  // The community page lists every race in its provinces.
  revalidateRegionPage(destination.province.regionId, source);
}

export function revalidateCategoryPages(source: string) {
  for (const locale of locales) {
    for (const slug of RACE_CATEGORY_SLUGS) {
      revalidatePath(getTypePath(locale, slug));
    }
  }
  logRevalidation(
    source,
    'category-pages',
    locales.length * RACE_CATEGORY_SLUGS.length,
  );
}

export function revalidateDestinationPages(source: string) {
  for (const regionId of REGION_IDS) {
    revalidateRegionPage(regionId, source);
  }

  for (const provinceId of DESTINATION_PROVINCE_IDS) {
    const province = GEOGRAPHY.provinces[provinceId];

    for (const locale of locales) {
      revalidatePath(
        getDestinationPath(locale, province.regionId, provinceId),
      );
    }
  }
  logRevalidation(
    source,
    'destination-pages',
    locales.length * DESTINATION_PROVINCE_IDS.length,
  );
}

export function revalidatePublicListingPages(source: string) {
  revalidateHomepages(source);
  revalidateCategoryPages(source);
  revalidateDestinationPages(source);
}

export function revalidateEventPages(eventSlugs: string | string[], source: string) {
  const slugs = Array.isArray(eventSlugs) ? eventSlugs : [eventSlugs];
  for (const eventSlug of slugs) {
    for (const locale of locales) {
      revalidatePath(`/${locale}/e/${eventSlug}`);
    }
  }
  logRevalidation(
    source,
    'event-pages',
    locales.length * slugs.length,
  );
}

export function revalidateEventTrackRoutes(eventId: string, source: string) {
  revalidateTag(`event-track-routes:${eventId}`, 'max');
  logRevalidation(source, 'event-track-routes', 0, 1);
}

/**
 * Revalidates the paths whose rendered output can change after an event
 * mutation. Event pages are always refreshed; listing pages are refreshed only
 * when their PublicEventDetail projection changed.
 */
export function revalidateEventMutation(
  previousDetail: TrailEventDetail | null,
  updatedDetail: TrailEventDetail | null,
  source: string,
): void {
  const paths = new Set<string>();
  const details = [previousDetail, updatedDetail].filter(
    (detail): detail is TrailEventDetail => detail !== null,
  );

  for (const detail of details) {
    for (const locale of locales) {
      paths.add(`/${locale}/e/${detail.event.slug}`);
    }
  }

  const listingChanged = previousDetail === null
    || updatedDetail === null
    || JSON.stringify(toPublicEventDetail(previousDetail))
      !== JSON.stringify(toPublicEventDetail(updatedDetail));

  if (listingChanged) {
    for (const locale of locales) {
      paths.add(`/${locale}`);

      for (const category of RACE_CATEGORY_SLUGS) {
        paths.add(getTypePath(locale, category));
      }
    }

    for (const detail of details) {
      for (const race of detail.races) {
        const destination = getProvinceByDbName(race.province);
        if (!destination) continue;

        for (const locale of locales) {
          paths.add(
            getDestinationPath(
              locale,
              destination.province.regionId,
              destination.id,
            ),
          );
          paths.add(getRegionPath(locale, destination.province.regionId));
        }
      }
    }
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  logRevalidation(source, 'event-mutation', paths.size, 0, listingChanged);
}

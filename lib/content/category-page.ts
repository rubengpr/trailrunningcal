import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getUpcomingEventsPage } from '@/lib/db/events';
import type { MapPageLabels } from '@/types/map.types';
import type {
  PublicEventPage,
  PublicEventScope,
} from '@/types/public-events.types';

export interface CategoryPageData {
  eventsPage: PublicEventPage;
  labels: MapPageLabels;
  calendarLabel: string;
  year: number;
}

export async function getCategoryPageData(
  locale: Locale,
  scope: PublicEventScope,
): Promise<CategoryPageData> {
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const [tNav, tCommon, eventsPage] = await Promise.all([
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale }),
    getUpcomingEventsPage({
      page: 1,
      referenceDate: today,
      filters: {
        months: [],
        provinces: [],
        distanceRanges: [],
        raceTypes: [],
      },
      scope,
    }),
  ]);

  const labels: MapPageLabels = {
    previousEvent: tCommon('map.previousEvent'),
    nextEvent: tCommon('map.nextEvent'),
    eventPageLink: tCommon('map.eventPageLink'),
    dateTbd: tCommon('event.dateTbd'),
  };

  return {
    eventsPage,
    labels,
    calendarLabel: tNav('calendar'),
    year,
  };
}

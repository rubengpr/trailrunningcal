import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getUpcomingEvents } from '@/lib/db/events';
import { getEventsMapData } from '@/lib/db/events-map';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';
import type { PublicEventDetail } from '@/types/event.types';

export interface CategoryPageData {
  events: PublicEventDetail[];
  markers: RaceMapMarker[];
  labels: MapPageLabels;
  calendarLabel: string;
  year: number;
}

export async function getCategoryPageData(locale: Locale): Promise<CategoryPageData> {
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tCommon = await getTranslations({ locale });
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const [events, { markers }] = await Promise.all([
    getUpcomingEvents(today),
    getEventsMapData(),
  ]);

  const labels: MapPageLabels = {
    previousRace: tCommon('map.previousRace'),
    nextRace: tCommon('map.nextRace'),
    racePageLink: tCommon('map.racePageLink'),
    notAvailable: tCommon('race.notAvailable'),
  };

  return {
    events,
    markers,
    labels,
    calendarLabel: tNav('calendar'),
    year,
  };
}

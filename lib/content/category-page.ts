import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getEvents } from '@/lib/db/events';
import { getRacesMapData } from '@/lib/db/races-map';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';
import type { TrailEventDetail } from '@/types/event.types';

export interface CategoryPageData {
  events: TrailEventDetail[];
  markers: RaceMapMarker[];
  labels: MapPageLabels;
  calendarLabel: string;
  year: number;
}

export async function getCategoryPageData(locale: Locale): Promise<CategoryPageData> {
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tCommon = await getTranslations({ locale });
  const year = new Date().getFullYear();
  const [events, { markers }] = await Promise.all([getEvents(), getRacesMapData()]);

  const labels: MapPageLabels = {
    previousRace: tCommon('map.previousRace'),
    nextRace: tCommon('map.nextRace'),
    racePageLink: tCommon('map.racePageLink'),
    notAvailable: tCommon('race.notAvailable'),
  };

  return { events, markers, labels, calendarLabel: tNav('calendar'), year };
}

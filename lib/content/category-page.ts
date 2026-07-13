import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getUpcomingEvents } from '@/lib/db/events';
import { getEventMapLocations } from '@/lib/db/events-map';
import { buildEventMapMarkers } from '@/lib/events/map';
import type { EventMapMarker, MapPageLabels } from '@/types/map.types';
import type { PublicEventDetail } from '@/types/event.types';

export interface CategoryPageData {
  events: PublicEventDetail[];
  markers: EventMapMarker[];
  labels: MapPageLabels;
  calendarLabel: string;
  year: number;
}

export async function getCategoryPageData(locale: Locale): Promise<CategoryPageData> {
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const [tNav, tCommon, events, locations] = await Promise.all([
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale }),
    getUpcomingEvents(today),
    getEventMapLocations(),
  ]);
  const markers = buildEventMapMarkers(events, locations);

  const labels: MapPageLabels = {
    previousEvent: tCommon('map.previousEvent'),
    nextEvent: tCommon('map.nextEvent'),
    eventPageLink: tCommon('map.eventPageLink'),
    dateTbd: tCommon('event.dateTbd'),
  };

  return {
    events,
    markers,
    labels,
    calendarLabel: tNav('calendar'),
    year,
  };
}

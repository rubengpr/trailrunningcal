import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { getRaces } from '@/lib/db/races';
import { getRacesMapData } from '@/lib/db/races-map';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';
import type { TrailRace } from '@/types/race.types';

export interface CategoryPageData {
  allRaces: TrailRace[];
  markers: RaceMapMarker[];
  labels: MapPageLabels;
  calendarLabel: string;
  year: number;
}

export async function getCategoryPageData(locale: Locale): Promise<CategoryPageData> {
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tCommon = await getTranslations({ locale });
  const year = new Date().getFullYear();
  const [allRaces, { markers }] = await Promise.all([getRaces(), getRacesMapData()]);

  const labels: MapPageLabels = {
    previousRace: tCommon('map.previousRace'),
    nextRace: tCommon('map.nextRace'),
    racePageLink: tCommon('map.racePageLink'),
    notAvailable: tCommon('race.notAvailable'),
  };

  return { allRaces, markers, labels, calendarLabel: tNav('calendar'), year };
}

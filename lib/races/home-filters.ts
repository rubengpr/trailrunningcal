import type { TrailRace } from '@/types/race.types';
import type { RaceMapMarker } from '@/types/map.types';
import {
  getRaceCategoryConfig,
  RACE_CATEGORY_CONFIGS,
  RACE_CATEGORY_SLUGS,
  type RaceCategorySlug,
} from '@/lib/races/race-types';

const DISTANCE_RANGES: Record<string, [number, number]> = {
  '0-10':  [0,  10],
  '10-20': [10, 20],
  '20-30': [20, 30],
  '30-40': [30, 40],
  '40-50': [40, 50],
  '50+':   [50, Infinity],
};

export const RACE_TYPES = RACE_CATEGORY_SLUGS;

export const RACE_TYPE_CATEGORY_KEYS: Record<RaceCategorySlug, string> = Object.fromEntries(
  RACE_CATEGORY_SLUGS.map((slug) => [slug, RACE_CATEGORY_CONFIGS[slug].labelKey]),
) as Record<RaceCategorySlug, string>;
export type RaceType = (typeof RACE_TYPES)[number];

function matchesRaceType(race: TrailRace, type: RaceType): boolean {
  return getRaceCategoryConfig(type).matches(race);
}

export function filterHomeRaces(
  races: TrailRace[],
  selectedMonth: string[],
  selectedProvince: string[],
  selectedDistance: string[] = [],
  selectedRaceType: string[] = [],
): TrailRace[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const racesWithDates = races.map((race) => {
    if (!race.date) return { race, parsedDate: null as Date | null };
    const d = new Date(race.date);
    d.setHours(0, 0, 0, 0);
    return { race, parsedDate: d };
  });

  return racesWithDates
    .filter(({ parsedDate }) => parsedDate !== null && parsedDate > today)
    .filter(({ parsedDate }) => {
      if (selectedMonth.length === 0) return true;
      if (!parsedDate) return false;
      const month = parsedDate.getMonth();
      return selectedMonth.some((m) => parseInt(m, 10) === month);
    })
    .filter(({ race }) => selectedProvince.length === 0 || selectedProvince.includes(race.province))
    .filter(({ race }) => {
      if (selectedDistance.length === 0) return true;
      const km = race.distanceKm;
      if (km === null || km === undefined) return false;
      return selectedDistance.some((d) => {
        const range = DISTANCE_RANGES[d];
        if (!range) return false;
        const [min, max] = range;
        return km >= min && km < max;
      });
    })
    .filter(({ race }) => {
      if (selectedRaceType.length === 0) return true;
      return selectedRaceType.some((type) => matchesRaceType(race, type as RaceType));
    })
    .map(({ race }) => race);
}

export function filterMapMarkersByRaceIds(
  markers: RaceMapMarker[],
  raceIds: ReadonlySet<string>,
): RaceMapMarker[] {
  return markers
    .map((marker) => ({
      ...marker,
      races: marker.races.filter((r) => raceIds.has(r.id)),
    }))
    .filter((m) => m.races.length > 0);
}

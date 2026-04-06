import type { TrailRace } from '@/types/race.types';
import type { RaceMapMarker } from '@/types/map.types';

const DISTANCE_RANGES: Record<string, [number, number]> = {
  '0-10':  [0,  10],
  '10-20': [10, 20],
  '20-30': [20, 30],
  '30-40': [30, 40],
  '40-50': [40, 50],
  '50+':   [50, Infinity],
};

/**
 * Same rules as the home calendar: future dated races only, optional month, province, and distance filter.
 */
export function filterHomeRaces(
  races: TrailRace[],
  selectedMonth: string,
  selectedProvince: string,
  selectedDistance: string = '',
): TrailRace[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthNumber = selectedMonth ? parseInt(selectedMonth, 10) : null;
  const distanceRange = selectedDistance ? DISTANCE_RANGES[selectedDistance] ?? null : null;

  const racesWithDates = races.map((race) => {
    if (!race.date) return { race, parsedDate: null as Date | null };
    const d = new Date(race.date);
    d.setHours(0, 0, 0, 0);
    return { race, parsedDate: d };
  });

  return racesWithDates
    .filter(({ parsedDate }) => parsedDate !== null && parsedDate > today)
    .filter(({ parsedDate }) =>
      monthNumber === null ? true : parsedDate !== null && parsedDate.getMonth() === monthNumber,
    )
    .filter(({ race }) => !selectedProvince || race.province === selectedProvince)
    .filter(({ race }) => {
      if (!distanceRange) return true;
      const km = race.distanceKm;
      if (km === null || km === undefined) return false;
      const [min, max] = distanceRange;
      return km >= min && km < max;
    })
    .map(({ race }) => race);
}

/**
 * Keeps only pin races present in the filtered calendar set; drops empty markers.
 */
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

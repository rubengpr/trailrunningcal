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

export const RACE_TYPES = ['ultra-trail', 'maraton', 'media-maraton', 'marcha', 'km-vertical', 'backyard'] as const;

export const RACE_TYPE_CATEGORY_KEYS: Record<string, string> = {
  'ultra-trail': 'ultra',
  'maraton': 'maraton',
  'media-maraton': 'media',
  'marcha': 'marcha',
  'km-vertical': 'vk',
  'backyard': 'backyard',
};
export type RaceType = (typeof RACE_TYPES)[number];

const VK_KEYWORDS = ['kilómetro vertical', 'quilòmetre vertical', 'km vertical'];
const MARCHA_KEYWORDS = ['marcha', 'marxa', 'caminada'];

export function matchesRaceType(race: TrailRace, type: RaceType): boolean {
  const lowerName = race.name.toLowerCase();
  switch (type) {
    case 'backyard':
      return lowerName.includes('backyard');
    case 'km-vertical': {
      const hasKeyword =
        VK_KEYWORDS.some((kw) => lowerName.includes(kw)) ||
        lowerName.includes(' kv ') ||
        lowerName.startsWith('kv ') ||
        lowerName.endsWith(' kv');
      const hasRatio =
        race.distanceKm < 4 && race.elevationGainM !== null && race.elevationGainM >= 600;
      return hasKeyword || hasRatio;
    }
    case 'marcha':
      return MARCHA_KEYWORDS.some((kw) => lowerName.includes(kw));
    case 'ultra-trail':
      return race.distanceKm >= 50;
    case 'maraton':
      return race.distanceKm >= 40 && race.distanceKm < 50;
    case 'media-maraton':
      return race.distanceKm >= 20 && race.distanceKm <= 24;
  }
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

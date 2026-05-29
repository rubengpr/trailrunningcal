import type {
  TrailEventDateRange,
  TrailEventLocation,
  TrailEventRace,
} from '@/types/event.types';

function yearFromDate(date: string): number {
  return Number.parseInt(date.slice(0, 4), 10);
}

function sortByDistanceDescending(races: TrailEventRace[]): TrailEventRace[] {
  return [...races].sort(
    (a, b) => b.distanceKm - a.distanceKm || a.name.localeCompare(b.name),
  );
}

export function selectRelevantEventRaces(
  races: TrailEventRace[],
  referenceDate: string = new Date().toISOString().slice(0, 10),
): TrailEventRace[] {
  const datedRaces = races.filter((race) => race.date !== null);

  if (datedRaces.length === 0) {
    return sortByDistanceDescending(races);
  }

  const upcomingRaces = datedRaces.filter((race) => race.date! >= referenceDate);

  if (upcomingRaces.length > 0) {
    const earliestUpcomingDate = upcomingRaces.reduce((earliest, race) =>
      race.date! < earliest.date! ? race : earliest,
    ).date!;
    const selectedYear = yearFromDate(earliestUpcomingDate);

    return sortByDistanceDescending(
      datedRaces.filter((race) => yearFromDate(race.date!) === selectedYear),
    );
  }

  const latestPastDate = datedRaces.reduce((latest, race) =>
    race.date! > latest.date! ? race : latest,
  ).date!;
  const selectedYear = yearFromDate(latestPastDate);

  return sortByDistanceDescending(
    datedRaces.filter((race) => yearFromDate(race.date!) === selectedYear),
  );
}

export function buildEventDateRange(
  races: TrailEventRace[],
): TrailEventDateRange {
  const dates = races
    .map((race) => race.date)
    .filter((date): date is string => date !== null)
    .sort();

  return {
    startDate: dates[0] ?? null,
    endDate: dates.at(-1) ?? null,
  };
}

export function buildEventLocation(
  races: TrailEventRace[],
): TrailEventLocation {
  const cities = new Set(
    races.map((race) => race.city.trim()).filter((city) => city.length > 0),
  );
  const provinces = new Set(
    races
      .map((race) => race.province.trim())
      .filter((province) => province.length > 0),
  );
  const isMultipleLocations = cities.size > 1 || provinces.size > 1;

  return {
    city: isMultipleLocations ? null : [...cities][0] ?? null,
    province: isMultipleLocations ? null : [...provinces][0] ?? null,
    isMultipleLocations,
  };
}

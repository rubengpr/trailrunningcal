import type {
  TrailEventDateRange,
  TrailEvent,
  TrailEventDetail,
  TrailEventLocation,
  TrailEventRace,
  PublicEventDetail,
} from '@/types/event.types';
import type { Locale } from '@/i18n';
import { formatDateToCatalan, formatDateToSpanish, formatIsoDateNumeric } from '@/lib/utils/date';
import {
  getRaceCategoryConfig,
  isNonCompetitiveRace,
  type RaceCategorySlug,
} from '@/lib/races/race-types';

const DISTANCE_RANGES: Record<string, [number, number]> = {
  '0-10': [0, 10],
  '10-20': [10, 20],
  '20-30': [20, 30],
  '30-40': [30, 40],
  '40-50': [40, 50],
  '50+': [50, Infinity],
};

function yearFromDate(date: string): number {
  return Number.parseInt(date.slice(0, 4), 10);
}

function sortByDistanceDescending(races: TrailEventRace[]): TrailEventRace[] {
  return [...races].sort(
    (a, b) =>
      Number(isNonCompetitiveRace(a)) - Number(isNonCompetitiveRace(b)) ||
      b.distanceKm - a.distanceKm ||
      (a.name ?? '').localeCompare(b.name ?? ''),
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
  const cities = new Set<string>();
  const citiesByProvince = new Map<string, string[]>();
  const provinceOrder: string[] = [];

  for (const race of races) {
    const city = race.city.trim();
    const province = race.province.trim();

    if (city.length > 0) {
      cities.add(city);
    }

    if (province.length === 0) {
      continue;
    }

    if (!citiesByProvince.has(province)) {
      citiesByProvince.set(province, []);
      provinceOrder.push(province);
    }

    const provinceCities = citiesByProvince.get(province)!;
    if (city.length > 0 && !provinceCities.includes(city)) {
      provinceCities.push(city);
    }
  }

  const groups = provinceOrder.map((province) => ({
    province,
    cities: citiesByProvince.get(province) ?? [],
  }));
  const isMultipleLocations = cities.size > 1 || provinceOrder.length > 1;

  return {
    city: isMultipleLocations ? null : [...cities][0] ?? null,
    province: isMultipleLocations ? null : provinceOrder[0] ?? null,
    groups,
    isMultipleLocations,
  };
}

/**
 * Builds a display label for an event's location(s). Cities are grouped by
 * province so a shared province is shown only once, with their cities joined
 * using a locale-aware conjunction (e.g. "Bagà y Sabadell, Barcelona" in es,
 * "Bagà i Sabadell, Barcelona" in ca); distinct provinces are separated with
 * " | ".
 */
export function formatEventLocationLabel(
  location: TrailEventLocation,
  locale: Locale,
): string {
  if (location.groups.length === 0) {
    return [location.city, location.province].filter(Boolean).join(', ');
  }

  const cityList = new Intl.ListFormat(locale, {
    style: 'long',
    type: 'conjunction',
  });

  return location.groups
    .map((group) =>
      [group.cities.length > 0 ? cityList.format(group.cities) : '', group.province]
        .filter((part) => part.length > 0)
        .join(', '),
    )
    .join(' | ');
}

export function buildEventDetail(
  event: TrailEvent,
  allRaces: TrailEventRace[],
): TrailEventDetail {
  const races = selectRelevantEventRaces(allRaces);

  return {
    event,
    races,
    allRaceCount: allRaces.length,
    dateRange: buildEventDateRange(races),
    location: buildEventLocation(races),
  };
}

export function toPublicEventDetail(eventDetail: TrailEventDetail): PublicEventDetail {
  return {
    event: {
      id: eventDetail.event.id,
      name: eventDetail.event.name,
      slug: eventDetail.event.slug,
    },
    races: eventDetail.races.map((race) => ({
      id: race.id,
      name: race.name,
      date: race.date,
      distanceKm: race.distanceKm,
      elevationGainM: race.elevationGainM,
      city: race.city,
      province: race.province,
    })),
    dateRange: eventDetail.dateRange,
    location: eventDetail.location,
  };
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric' }).format(date);
}

function formatMonth(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    month: 'long',
  }).format(date);
}

function formatMonthYear(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ca' ? 'ca-ES' : 'es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function dateRangeConnector(locale: Locale): string {
  return locale === 'ca' ? ' - ' : ' - ';
}

function dayMonthConnector(locale: Locale): string {
  return locale === 'ca' ? ' de ' : ' de ';
}

export function formatEventDateRange(
  dateRange: TrailEventDateRange,
  locale: Locale,
  fallback: string,
): string {
  const { startDate, endDate } = dateRange;

  if (!startDate) {
    return fallback;
  }

  if (!endDate || startDate === endDate) {
    return locale === 'ca'
      ? formatDateToCatalan(startDate)
      : formatDateToSpanish(startDate);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fallback;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${formatDay(start)}-${formatDay(end)}${dayMonthConnector(locale)}${formatMonthYear(end, locale)}`;
  }

  if (sameYear) {
    return `${formatDay(start)}${dayMonthConnector(locale)}${formatMonth(start, locale)}${dateRangeConnector(locale)}${formatDay(end)}${dayMonthConnector(locale)}${formatMonthYear(end, locale)}`;
  }

  const formattedStart = locale === 'ca'
    ? formatDateToCatalan(startDate)
    : formatDateToSpanish(startDate);
  const formattedEnd = locale === 'ca'
    ? formatDateToCatalan(endDate)
    : formatDateToSpanish(endDate);

  return `${formattedStart}${dateRangeConnector(locale)}${formattedEnd}`;
}

export function formatEventDateRangeNumeric(
  dateRange: TrailEventDateRange,
  fallback: string,
): string {
  const { startDate, endDate } = dateRange;

  if (!startDate) {
    return fallback;
  }

  const formattedStart = formatIsoDateNumeric(startDate);
  if (!formattedStart) {
    return fallback;
  }

  if (!endDate || startDate === endDate) {
    return formattedStart;
  }

  const formattedEnd = formatIsoDateNumeric(endDate);
  if (!formattedEnd) {
    return fallback;
  }

  return `${formattedStart} - ${formattedEnd}`;
}

export function selectRecommendedEvents(
  events: TrailEventDetail[],
  {
    province,
    excludeEventId,
    afterDate,
    limit,
  }: {
    province: string;
    excludeEventId: string;
    afterDate: string;
    limit: number;
  },
): TrailEventDetail[] {
  return events
    .filter((eventDetail) => {
      if (eventDetail.event.id === excludeEventId) {
        return false;
      }

      if (eventDetail.location.isMultipleLocations) {
        return false;
      }

      if (eventDetail.location.province !== province) {
        return false;
      }

      if (!eventDetail.dateRange.startDate) {
        return false;
      }

      return eventDetail.dateRange.startDate >= afterDate;
    })
    .sort((a, b) => {
      const dateComparison = a.dateRange.startDate!.localeCompare(b.dateRange.startDate!);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      return a.event.name.localeCompare(b.event.name);
    })
    .slice(0, limit);
}

function matchesDistance(distanceKm: number, selectedDistance: string[]): boolean {
  if (selectedDistance.length === 0) {
    return true;
  }

  return selectedDistance.some((distance) => {
    const range = DISTANCE_RANGES[distance];
    if (!range) {
      return false;
    }

    const [min, max] = range;
    return distanceKm >= min && distanceKm < max;
  });
}

function matchesRaceType(
  race: PublicEventDetail['races'][number],
  selectedRaceType: string[],
): boolean {
  if (selectedRaceType.length === 0) {
    return true;
  }

  return selectedRaceType.some((type) =>
    getRaceCategoryConfig(type as RaceCategorySlug).matches(race),
  );
}

function monthIndexFromDateString(date: string): number {
  return Number.parseInt(date.slice(5, 7), 10) - 1;
}

export function filterHomeEvents(
  events: PublicEventDetail[],
  selectedMonth: string[],
  selectedProvince: string[],
  selectedDistance: string[] = [],
  selectedRaceType: string[] = [],
  referenceDate: string = new Date().toISOString().slice(0, 10),
): PublicEventDetail[] {
  return events
    .filter((eventDetail) => eventDetail.dateRange.startDate !== null)
    .filter((eventDetail) => eventDetail.dateRange.startDate! > referenceDate)
    .filter((eventDetail) => {
      if (selectedMonth.length === 0) {
        return true;
      }

      const month = monthIndexFromDateString(eventDetail.dateRange.startDate!);

      return selectedMonth.some((selected) => Number.parseInt(selected, 10) === month);
    })
    .filter((eventDetail) =>
      selectedProvince.length === 0 ||
      eventDetail.location.groups.some((group) =>
        selectedProvince.includes(group.province),
      ),
    )
    .filter((eventDetail) => {
      if (selectedDistance.length === 0) {
        return true;
      }

      return eventDetail.races.some((race) =>
        matchesDistance(race.distanceKm, selectedDistance),
      );
    })
    .filter((eventDetail) => {
      if (selectedRaceType.length === 0) {
        return true;
      }

      return eventDetail.races.some((race) =>
        matchesRaceType(race, selectedRaceType),
      );
    })
    .sort((a, b) => {
      const dateComparison = a.dateRange.startDate!.localeCompare(b.dateRange.startDate!);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      return a.event.name.localeCompare(b.event.name);
    });
}

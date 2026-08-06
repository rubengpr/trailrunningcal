import { ValidationError } from '@/lib/errors';
import { DISTANCE_GROUPS, MONTH_INDICES } from '@/lib/constants';
import {
  isRaceCategorySlug,
  type RaceCategorySlug,
} from '@/lib/races/race-types';
import type {
  PublicEventFilters,
  PublicEventPageRequest,
  PublicEventScope,
} from '@/types/public-events.types';
import { MAX_PUBLIC_EVENTS_PAGE } from '@/lib/db/public-events-pagination';

const DISTANCE_GROUP_SET = new Set<string>(DISTANCE_GROUPS);
const MONTH_INDEX_SET = new Set<number>(MONTH_INDICES);
const MAX_FILTER_VALUES = 20;
const MAX_PROVINCE_LENGTH = 100;

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

function parsePage(value: string | null): number {
  if (value === null) return 1;

  const page = Number(value);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > MAX_PUBLIC_EVENTS_PAGE
  ) {
    throw new ValidationError('Invalid page', 400);
  }

  return page;
}

function parseReferenceDate(value: string | null): string {
  if (value === null) {
    return new Date().toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('Invalid reference date', 400);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError('Invalid reference date', 400);
  }

  return value;
}

function parseMonths(values: string[]): number[] {
  const months = uniqueValues(values).map(Number);
  if (
    months.length > MAX_FILTER_VALUES ||
    months.some((month) => !Number.isInteger(month) || !MONTH_INDEX_SET.has(month))
  ) {
    throw new ValidationError('Invalid month filter', 400);
  }

  return months;
}

function parseProvinces(values: string[]): string[] {
  const provinces = uniqueValues(values.map((value) => value.trim()));
  if (
    provinces.length > MAX_FILTER_VALUES ||
    provinces.some(
      (province) =>
        province.length === 0 || province.length > MAX_PROVINCE_LENGTH,
    )
  ) {
    throw new ValidationError('Invalid province filter', 400);
  }

  return provinces;
}

function parseDistanceRanges(values: string[]): string[] {
  const ranges = uniqueValues(values);
  if (
    ranges.length > DISTANCE_GROUPS.length ||
    ranges.some((range) => !DISTANCE_GROUP_SET.has(range))
  ) {
    throw new ValidationError('Invalid distance filter', 400);
  }

  return ranges;
}

function parseRaceTypes(values: string[]): RaceCategorySlug[] {
  const raceTypes = uniqueValues(values);
  if (raceTypes.some((raceType) => !isRaceCategorySlug(raceType))) {
    throw new ValidationError('Invalid race type filter', 400);
  }

  return raceTypes as RaceCategorySlug[];
}

function parseScope(searchParams: URLSearchParams): PublicEventScope | undefined {
  const province = searchParams.get('scopeProvince')?.trim();
  if (province !== undefined && (
    province.length === 0 || province.length > MAX_PROVINCE_LENGTH
  )) {
    throw new ValidationError('Invalid province scope', 400);
  }

  const raceType = searchParams.get('scopeType');
  if (raceType !== null && !isRaceCategorySlug(raceType)) {
    throw new ValidationError('Invalid race type scope', 400);
  }

  if (province === undefined && raceType === null) {
    return undefined;
  }

  return {
    ...(province !== undefined ? { province } : {}),
    ...(raceType !== null ? { raceType } : {}),
  };
}

export function parsePublicEventPageRequest(
  searchParams: URLSearchParams,
): PublicEventPageRequest {
  const filters: PublicEventFilters = {
    months: parseMonths(searchParams.getAll('month')),
    provinces: parseProvinces(searchParams.getAll('province')),
    distanceRanges: parseDistanceRanges(searchParams.getAll('distance')),
    raceTypes: parseRaceTypes(searchParams.getAll('type')),
  };

  return {
    page: parsePage(searchParams.get('page')),
    referenceDate: parseReferenceDate(searchParams.get('referenceDate')),
    filters,
    scope: parseScope(searchParams),
  };
}

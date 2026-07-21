import { describe, expect, it } from 'vitest';
import {
  getPrimaryPublicRaceCategory,
  getRaceDisplayCategoryKey,
  getRaceCategoryConfig,
  getRaceCategorySlugsForRace,
  isNonCompetitiveRace,
  isRaceCategorySlug,
} from '@/lib/races/race-types';
import type { TrailRace } from '@/types/race.types';

function race(overrides: Partial<TrailRace>): TrailRace {
  return {
    id: 'race-1',
    name: 'Trail Test',
    date: '2026-05-22',
    distanceKm: 10,
    elevationGainM: 300,
    city: 'Barcelona',
    province: 'Barcelona',
    description: null,
    organizerId: null,
    ...overrides,
  };
}

describe('isRaceCategorySlug', () => {
  it('accepts supported public category slugs', () => {
    expect(isRaceCategorySlug('ultra-trail')).toBe(true);
    expect(isRaceCategorySlug('maraton')).toBe(true);
    expect(isRaceCategorySlug('media-maraton')).toBe(true);
    expect(isRaceCategorySlug('marcha')).toBe(true);
    expect(isRaceCategorySlug('km-vertical')).toBe(true);
    expect(isRaceCategorySlug('backyard')).toBe(true);
  });

  it('rejects unsupported slugs', () => {
    expect(isRaceCategorySlug('contacto')).toBe(false);
    expect(isRaceCategorySlug('trail')).toBe(false);
  });
});

describe('race category predicates', () => {
  it('identifies non-competitive walks by name', () => {
    expect(isNonCompetitiveRace(race({ name: 'Marcha popular' }))).toBe(true);
    expect(isNonCompetitiveRace(race({ name: 'MARXA popular' }))).toBe(true);
    expect(isNonCompetitiveRace(race({ name: 'Caminada popular' }))).toBe(true);
    expect(isNonCompetitiveRace(race({ name: 'Trail de muntanya' }))).toBe(false);
    expect(isNonCompetitiveRace({ name: null })).toBe(false);
  });

  it('matches ultra trail races at 50 km and above', () => {
    const config = getRaceCategoryConfig('ultra-trail');

    expect(config.matches(race({ distanceKm: 50 }))).toBe(true);
    expect(config.matches(race({ distanceKm: 49.9 }))).toBe(false);
  });

  it('matches marathon trail races from 40 km up to below 50 km', () => {
    const config = getRaceCategoryConfig('maraton');

    expect(config.matches(race({ distanceKm: 40 }))).toBe(true);
    expect(config.matches(race({ distanceKm: 49.9 }))).toBe(true);
    expect(config.matches(race({ distanceKm: 50 }))).toBe(false);
  });

  it('matches media maraton races from 20 km through 24 km', () => {
    const config = getRaceCategoryConfig('media-maraton');

    expect(config.matches(race({ distanceKm: 20 }))).toBe(true);
    expect(config.matches(race({ distanceKm: 24 }))).toBe(true);
    expect(config.matches(race({ distanceKm: 25 }))).toBe(false);
  });

  it('matches walking races by known keywords', () => {
    const config = getRaceCategoryConfig('marcha');

    expect(config.matches(race({ name: 'Marxa de muntanya' }))).toBe(true);
    expect(config.matches(race({ name: 'Caminada popular' }))).toBe(true);
    expect(config.matches(race({ name: 'Trail de muntanya' }))).toBe(false);
  });

  it('matches backyard races by name', () => {
    const config = getRaceCategoryConfig('backyard');

    expect(config.matches(race({ name: 'Backyard Ultra Barcelona' }))).toBe(true);
    expect(config.matches(race({ name: 'Ultra Trail Barcelona' }))).toBe(false);
  });

  it('matches vertical kilometer races by keyword or ratio', () => {
    const config = getRaceCategoryConfig('km-vertical');

    expect(config.matches(race({ name: 'Km Vertical de la Vall' }))).toBe(true);
    expect(config.matches(race({ distanceKm: 3.5, elevationGainM: 700 }))).toBe(true);
    expect(config.matches(race({ distanceKm: 5, elevationGainM: 700 }))).toBe(false);
  });
});

describe('race category resolution', () => {
  it('returns every matching public category slug', () => {
    expect(
      getRaceCategorySlugsForRace(
        race({ name: 'Marxa Ultra Backyard', distanceKm: 60, elevationGainM: 2500 }),
      ),
    ).toEqual(['ultra-trail', 'marcha', 'backyard']);
  });

  it('uses the configured priority for the primary public category', () => {
    const primary = getPrimaryPublicRaceCategory(
      race({ name: 'Marxa Ultra Backyard', distanceKm: 60, elevationGainM: 2500 }),
    );

    expect(primary?.slug).toBe('marcha');
  });

  it('does not resolve 25-39 km races to media-maraton', () => {
    expect(getRaceCategorySlugsForRace(race({ distanceKm: 30 }))).toEqual([]);
    expect(getPrimaryPublicRaceCategory(race({ distanceKm: 30 }))).toBeNull();
  });

  it('keeps a non-public display category for 25-39 km races', () => {
    expect(getRaceDisplayCategoryKey(race({ distanceKm: 30 }))).toBe('media');
  });
});

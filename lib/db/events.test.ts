import { describe, expect, it } from 'vitest';
import {
  buildEventDateRange,
  buildEventLocation,
  selectRelevantEventRaces,
} from '@/lib/events/utils';
import type { TrailEventRace } from '@/types/event.types';

function race(
  overrides: Partial<TrailEventRace> & Pick<TrailEventRace, 'id' | 'date' | 'distanceKm'>,
): TrailEventRace {
  return {
    name: `Race ${overrides.id}`,
    elevationGainM: null,
    city: 'Bagà',
    province: 'Barcelona',
    mapUrl: null,
    priceEur: null,
    ...overrides,
  };
}

describe('selectRelevantEventRaces', () => {
  it('uses upcoming races before past races', () => {
    const result = selectRelevantEventRaces(
      [
        race({ id: 'past', date: '2025-05-01', distanceKm: 100 }),
        race({ id: 'future', date: '2026-05-01', distanceKm: 50 }),
      ],
      '2026-01-01',
    );

    expect(result.map((r) => r.id)).toEqual(['future']);
  });

  it('returns only the earliest upcoming race year', () => {
    const result = selectRelevantEventRaces(
      [
        race({ id: 'future-2027', date: '2027-04-01', distanceKm: 80 }),
        race({ id: 'future-2026-long', date: '2026-05-01', distanceKm: 100 }),
        race({ id: 'future-2026-short', date: '2026-05-02', distanceKm: 20 }),
      ],
      '2026-01-01',
    );

    expect(result.map((r) => r.id)).toEqual([
      'future-2026-long',
      'future-2026-short',
    ]);
  });

  it('returns the latest past race year when there are no upcoming races', () => {
    const result = selectRelevantEventRaces(
      [
        race({ id: 'past-2024', date: '2024-05-01', distanceKm: 100 }),
        race({ id: 'past-2025', date: '2025-05-01', distanceKm: 50 }),
      ],
      '2026-01-01',
    );

    expect(result.map((r) => r.id)).toEqual(['past-2025']);
  });

  it('does not let null dates drive edition selection', () => {
    const result = selectRelevantEventRaces(
      [
        race({ id: 'unknown', date: null, distanceKm: 200 }),
        race({ id: 'future', date: '2026-05-01', distanceKm: 50 }),
      ],
      '2026-01-01',
    );

    expect(result.map((r) => r.id)).toEqual(['future']);
  });

  it('sorts selected races by distance descending', () => {
    const result = selectRelevantEventRaces(
      [
        race({ id: 'short', date: '2026-05-01', distanceKm: 10 }),
        race({ id: 'long', date: '2026-05-01', distanceKm: 100 }),
        race({ id: 'medium', date: '2026-05-01', distanceKm: 42 }),
      ],
      '2026-01-01',
    );

    expect(result.map((r) => r.id)).toEqual(['long', 'medium', 'short']);
  });
});

describe('buildEventDateRange', () => {
  it('uses min and max selected race dates', () => {
    const result = buildEventDateRange([
      race({ id: 'second', date: '2026-05-03', distanceKm: 10 }),
      race({ id: 'first', date: '2026-05-01', distanceKm: 20 }),
    ]);

    expect(result).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-03',
    });
  });

  it('returns null dates when selected races have no date', () => {
    const result = buildEventDateRange([
      race({ id: 'unknown', date: null, distanceKm: 10 }),
    ]);

    expect(result).toEqual({
      startDate: null,
      endDate: null,
    });
  });
});

describe('buildEventLocation', () => {
  it('returns concrete location for one city and province', () => {
    const result = buildEventLocation([
      race({ id: 'one', date: '2026-05-01', distanceKm: 10 }),
      race({ id: 'two', date: '2026-05-02', distanceKm: 20 }),
    ]);

    expect(result).toEqual({
      city: 'Bagà',
      province: 'Barcelona',
      isMultipleLocations: false,
    });
  });

  it('marks multiple locations when cities differ', () => {
    const result = buildEventLocation([
      race({ id: 'one', date: '2026-05-01', distanceKm: 10, city: 'Bagà' }),
      race({ id: 'two', date: '2026-05-02', distanceKm: 20, city: 'Girona' }),
    ]);

    expect(result).toEqual({
      city: null,
      province: null,
      isMultipleLocations: true,
    });
  });

  it('marks multiple locations when provinces differ', () => {
    const result = buildEventLocation([
      race({
        id: 'one',
        date: '2026-05-01',
        distanceKm: 10,
        province: 'Barcelona',
      }),
      race({
        id: 'two',
        date: '2026-05-02',
        distanceKm: 20,
        province: 'Girona',
      }),
    ]);

    expect(result).toEqual({
      city: null,
      province: null,
      isMultipleLocations: true,
    });
  });
});

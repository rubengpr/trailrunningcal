import { describe, expect, it } from 'vitest';
import {
  buildEventDateRange,
  buildEventLocation,
  filterHomeEvents,
  formatEventDateRange,
  formatEventLocationLabel,
  selectRecommendedEvents,
  selectRelevantEventRaces,
} from '@/lib/events/utils';
import type { TrailEventDetail, TrailEventRace } from '@/types/event.types';

function race(
  overrides: Partial<TrailEventRace> & Pick<TrailEventRace, 'id' | 'date' | 'distanceKm'>,
): TrailEventRace {
  return {
    name: `Race ${overrides.id}`,
    elevationGainM: null,
    city: 'Bagà',
    province: 'Barcelona',
    mapUrl: null,
    tiers: [],
    ...overrides,
  };
}

function eventDetail(
  overrides: Partial<TrailEventDetail> & {
    id: string;
    name?: string;
    province?: string | null;
    startDate?: string | null;
  },
): TrailEventDetail {
  const province = overrides.province ?? 'Girona';
  const startDate = Object.prototype.hasOwnProperty.call(overrides, 'startDate')
    ? (overrides.startDate ?? null)
    : '2026-07-01';

  return {
    event: {
      id: overrides.id,
      name: overrides.name ?? `Event ${overrides.id}`,
      slug: `event-${overrides.id}`,
      websiteUrl: null,
      organizerId: null,
      description: null,
      heroImageFilename: null,
      updatedAt: null,
    },
    races: [],
    allRaceCount: 1,
    dateRange: {
      startDate,
      endDate: startDate,
    },
    location: {
      city: province ? 'Girona' : null,
      province,
      groups: province ? [{ province, cities: ['Girona'] }] : [],
      isMultipleLocations: false,
    },
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
      groups: [{ province: 'Barcelona', cities: ['Bagà'] }],
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
      groups: [{ province: 'Barcelona', cities: ['Bagà', 'Girona'] }],
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
      groups: [
        { province: 'Barcelona', cities: ['Bagà'] },
        { province: 'Girona', cities: ['Bagà'] },
      ],
      isMultipleLocations: true,
    });
  });
});

describe('formatEventLocationLabel', () => {
  it('shows city and province for a single location', () => {
    expect(
      formatEventLocationLabel(
        buildEventLocation([
          race({ id: 'one', date: '2026-05-01', distanceKm: 10, city: 'All', province: 'Girona' }),
        ]),
        'es',
      ),
    ).toBe('All, Girona');
  });

  it('joins two cities sharing a province with a conjunction', () => {
    expect(
      formatEventLocationLabel(
        buildEventLocation([
          race({ id: 'one', date: '2026-05-01', distanceKm: 10, city: 'Bagà', province: 'Barcelona' }),
          race({ id: 'two', date: '2026-05-02', distanceKm: 20, city: 'Sabadell', province: 'Barcelona' }),
        ]),
        'es',
      ),
    ).toBe('Bagà y Sabadell, Barcelona');
  });

  it('joins three cities sharing a province with commas and a conjunction', () => {
    expect(
      formatEventLocationLabel(
        buildEventLocation([
          race({ id: 'one', date: '2026-05-01', distanceKm: 10, city: 'Bagà', province: 'Barcelona' }),
          race({ id: 'two', date: '2026-05-02', distanceKm: 20, city: 'Sabadell', province: 'Barcelona' }),
          race({ id: 'three', date: '2026-05-03', distanceKm: 30, city: 'Terrassa', province: 'Barcelona' }),
        ]),
        'es',
      ),
    ).toBe('Bagà, Sabadell y Terrassa, Barcelona');
  });

  it('uses the Catalan conjunction for the ca locale', () => {
    expect(
      formatEventLocationLabel(
        buildEventLocation([
          race({ id: 'one', date: '2026-05-01', distanceKm: 10, city: 'Bagà', province: 'Barcelona' }),
          race({ id: 'two', date: '2026-05-02', distanceKm: 20, city: 'Sabadell', province: 'Barcelona' }),
        ]),
        'ca',
      ),
    ).toBe('Bagà i Sabadell, Barcelona');
  });

  it('separates distinct provinces with their own cities', () => {
    expect(
      formatEventLocationLabel(
        buildEventLocation([
          race({ id: 'one', date: '2026-05-01', distanceKm: 10, city: 'Bagà', province: 'Barcelona' }),
          race({ id: 'two', date: '2026-05-02', distanceKm: 20, city: 'Sabadell', province: 'Barcelona' }),
          race({ id: 'three', date: '2026-05-03', distanceKm: 30, city: 'La Molina', province: 'Girona' }),
        ]),
        'es',
      ),
    ).toBe('Bagà y Sabadell, Barcelona | La Molina, Girona');
  });
});

describe('formatEventDateRange', () => {
  it('formats a single date', () => {
    expect(
      formatEventDateRange(
        { startDate: '2026-05-29', endDate: '2026-05-29' },
        'es',
        'Fecha por confirmar',
      ),
    ).toBe('29 de mayo de 2026');
  });

  it('formats a range in the same month and year', () => {
    expect(
      formatEventDateRange(
        { startDate: '2026-05-29', endDate: '2026-05-31' },
        'es',
        'Fecha por confirmar',
      ),
    ).toBe('29-31 de mayo de 2026');
  });

  it('formats a Catalan range in the same month and year', () => {
    expect(
      formatEventDateRange(
        { startDate: '2026-05-29', endDate: '2026-05-31' },
        'ca',
        'Data per confirmar',
      ),
    ).toBe('29-31 de maig del 2026');
  });

  it('formats a range across months in the same year', () => {
    expect(
      formatEventDateRange(
        { startDate: '2026-05-31', endDate: '2026-06-02' },
        'es',
        'Fecha por confirmar',
      ),
    ).toBe('31 de mayo - 2 de junio de 2026');
  });

  it('formats a Catalan range across months in the same year', () => {
    expect(
      formatEventDateRange(
        { startDate: '2026-05-31', endDate: '2026-06-02' },
        'ca',
        'Data per confirmar',
      ),
    ).toBe('31 de maig - 2 de juny del 2026');
  });

  it('uses fallback when no date exists', () => {
    expect(
      formatEventDateRange(
        { startDate: null, endDate: null },
        'es',
        'Fecha por confirmar',
      ),
    ).toBe('Fecha por confirmar');
  });
});

describe('selectRecommendedEvents', () => {
  it('excludes the current event', () => {
    const result = selectRecommendedEvents(
      [
        eventDetail({ id: 'current', startDate: '2026-07-01' }),
        eventDetail({ id: 'other', startDate: '2026-07-02' }),
      ],
      {
        province: 'Girona',
        excludeEventId: 'current',
        afterDate: '2026-01-01',
        limit: 7,
      },
    );

    expect(result.map((event) => event.event.id)).toEqual(['other']);
  });

  it('returns only same-province single-location events', () => {
    const result = selectRecommendedEvents(
      [
        eventDetail({ id: 'same', province: 'Girona' }),
        eventDetail({ id: 'other-province', province: 'Barcelona' }),
        eventDetail({
          id: 'multi',
          location: {
            city: null,
            province: null,
            groups: [
              { province: 'Barcelona', cities: ['Bagà'] },
              { province: 'Girona', cities: ['La Molina'] },
            ],
            isMultipleLocations: true,
          },
        }),
      ],
      {
        province: 'Girona',
        excludeEventId: 'current',
        afterDate: '2026-01-01',
        limit: 7,
      },
    );

    expect(result.map((event) => event.event.id)).toEqual(['same']);
  });

  it('limits results', () => {
    const result = selectRecommendedEvents(
      [
        eventDetail({ id: 'one', startDate: '2026-07-01' }),
        eventDetail({ id: 'two', startDate: '2026-07-02' }),
      ],
      {
        province: 'Girona',
        excludeEventId: 'current',
        afterDate: '2026-01-01',
        limit: 1,
      },
    );

    expect(result.map((event) => event.event.id)).toEqual(['one']);
  });

  it('sorts upcoming recommendations by date ascending then name', () => {
    const result = selectRecommendedEvents(
      [
        eventDetail({ id: 'late', name: 'Late', startDate: '2026-08-01' }),
        eventDetail({ id: 'same-b', name: 'Beta', startDate: '2026-07-01' }),
        eventDetail({ id: 'same-a', name: 'Alpha', startDate: '2026-07-01' }),
      ],
      {
        province: 'Girona',
        excludeEventId: 'current',
        afterDate: '2026-01-01',
        limit: 7,
      },
    );

    expect(result.map((event) => event.event.id)).toEqual([
      'same-a',
      'same-b',
      'late',
    ]);
  });
});

describe('filterHomeEvents', () => {
  it('returns future dated events, including multi-location ones', () => {
    const result = filterHomeEvents(
      [
        eventDetail({ id: 'future', startDate: '2026-07-01' }),
        eventDetail({ id: 'past', startDate: '2026-05-01' }),
        eventDetail({ id: 'undated', startDate: null }),
        eventDetail({
          id: 'multi',
          location: {
            city: null,
            province: null,
            groups: [
              { province: 'Barcelona', cities: ['Bagà'] },
              { province: 'Girona', cities: ['La Molina'] },
            ],
            isMultipleLocations: true,
          },
        }),
      ],
      [],
      [],
      [],
      [],
      '2026-06-01',
    );

    expect(result.map((event) => event.event.id)).toEqual(['future', 'multi']);
  });

  it('filters by month', () => {
    const result = filterHomeEvents(
      [
        eventDetail({ id: 'july', startDate: '2026-07-01' }),
        eventDetail({ id: 'august', startDate: '2026-08-01' }),
      ],
      ['6'],
      [],
      [],
      [],
      '2026-06-01',
    );

    expect(result.map((event) => event.event.id)).toEqual(['july']);
  });

  it('filters first-day dates by month without timezone conversion', () => {
    const result = filterHomeEvents(
      [
        eventDetail({ id: 'march-first', startDate: '2026-03-01' }),
        eventDetail({ id: 'february', startDate: '2026-02-28' }),
      ],
      ['2'],
      [],
      [],
      [],
      '2026-01-01',
    );

    expect(result.map((event) => event.event.id)).toEqual(['march-first']);
  });

  it('filters by province', () => {
    const result = filterHomeEvents(
      [
        eventDetail({ id: 'girona', province: 'Girona' }),
        eventDetail({ id: 'barcelona', province: 'Barcelona' }),
      ],
      [],
      ['Girona'],
      [],
      [],
      '2026-06-01',
    );

    expect(result.map((event) => event.event.id)).toEqual(['girona']);
  });

  it('filters by any child distance', () => {
    const result = filterHomeEvents(
      [
        eventDetail({
          id: 'short',
          races: [race({ id: 'short-race', date: '2026-07-01', distanceKm: 8 })],
        }),
        eventDetail({
          id: 'long',
          races: [race({ id: 'long-race', date: '2026-07-01', distanceKm: 42 })],
        }),
      ],
      [],
      [],
      ['40-50'],
      [],
      '2026-06-01',
    );

    expect(result.map((event) => event.event.id)).toEqual(['long']);
  });

  it('filters by any child race type', () => {
    const result = filterHomeEvents(
      [
        eventDetail({
          id: 'ultra',
          races: [race({ id: 'ultra-race', date: '2026-07-01', distanceKm: 60 })],
        }),
        eventDetail({
          id: 'short',
          races: [race({ id: 'short-race', date: '2026-07-01', distanceKm: 8 })],
        }),
      ],
      [],
      [],
      [],
      ['ultra-trail'],
      '2026-06-01',
    );

    expect(result.map((event) => event.event.id)).toEqual(['ultra']);
  });
});

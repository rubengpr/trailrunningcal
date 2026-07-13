import { describe, expect, it } from 'vitest';
import type { PublicEventDetail } from '@/types/event.types';
import type { EventMapLocation } from '@/types/map.types';
import {
  buildEventMapMarkers,
  filterEventMapMarkersByEventIds,
} from './map';

const locations: EventMapLocation[] = [
  {
    city: 'Bagà',
    province: 'Barcelona',
    latitude: 42.25,
    longitude: 1.86,
  },
  {
    city: 'La Molina',
    province: 'Girona',
    latitude: 42.34,
    longitude: 1.96,
  },
  {
    city: 'Alp',
    province: 'Girona',
    latitude: 42.34,
    longitude: 1.96,
  },
];

function eventDetail(
  id: string,
  races: PublicEventDetail['races'],
  startDate = '2027-07-01',
): PublicEventDetail {
  const groups = Array.from(
    new Map(
      races.map((race) => [
        race.province,
        {
          province: race.province,
          cities: races
            .filter((candidate) => candidate.province === race.province)
            .map((candidate) => candidate.city),
        },
      ]),
    ).values(),
  );

  return {
    event: { id, name: `Event ${id}`, slug: `event-${id}` },
    races,
    dateRange: { startDate, endDate: startDate },
    location: {
      city: groups.length === 1 && groups[0].cities.length === 1
        ? groups[0].cities[0]
        : null,
      province: groups.length === 1 && groups[0].cities.length === 1
        ? groups[0].province
        : null,
      groups,
      isMultipleLocations: groups.length > 1 || groups[0].cities.length > 1,
    },
  };
}

function race(
  id: string,
  city: string,
  province: string,
  distanceKm: number,
): PublicEventDetail['races'][number] {
  return {
    id,
    name: `Race ${id}`,
    date: '2027-07-01',
    distanceKm,
    elevationGainM: null,
    city,
    province,
  };
}

describe('buildEventMapMarkers', () => {
  it('creates one event entry for duplicate races at one location', () => {
    const markers = buildEventMapMarkers([
      eventDetail('one', [
        race('long', 'Bagà', 'Barcelona', 42),
        race('short', 'Bagà', 'Barcelona', 21),
      ]),
    ], locations);

    expect(markers).toHaveLength(1);
    expect(markers[0].events).toHaveLength(1);
    expect(markers[0].events[0].distances).toEqual([
      { id: 'long', distanceKm: 42 },
      { id: 'short', distanceKm: 21 },
    ]);
  });

  it('places a multi-location event at every distinct location', () => {
    const markers = buildEventMapMarkers([
      eventDetail('one', [
        race('barcelona', 'Bagà', 'Barcelona', 42),
        race('girona', 'La Molina', 'Girona', 21),
      ]),
    ], locations);

    expect(markers.map((marker) => marker.city)).toEqual(['Bagà', 'La Molina']);
    expect(markers.every((marker) => marker.events[0].id === 'one')).toBe(true);
    expect(markers.map((marker) => marker.events[0].distances)).toEqual([
      [{ id: 'barcelona', distanceKm: 42 }],
      [{ id: 'girona', distanceKm: 21 }],
    ]);
  });

  it('omits event locations without coordinates', () => {
    const markers = buildEventMapMarkers([
      eventDetail('one', [race('unknown', 'Unknown', 'Girona', 10)]),
    ], locations);

    expect(markers).toEqual([]);
  });

  it('groups events from different locations sharing coordinates', () => {
    const markers = buildEventMapMarkers(
      [
        eventDetail('one', [race('one-race', 'La Molina', 'Girona', 42)]),
        eventDetail('two', [race('two-race', 'Alp', 'Girona', 21)]),
      ],
      locations,
    );

    expect(markers).toHaveLength(1);
    expect(markers[0].events.map((event) => event.id)).toEqual(['one', 'two']);
  });

  it('sorts events sharing a marker by date and name', () => {
    const markers = buildEventMapMarkers(
      [
        eventDetail(
          'later',
          [race('later-race', 'Bagà', 'Barcelona', 42)],
          '2027-08-01',
        ),
        eventDetail(
          'earlier',
          [race('earlier-race', 'Bagà', 'Barcelona', 21)],
          '2027-07-01',
        ),
      ],
      locations,
    );

    expect(markers[0].events.map((event) => event.id)).toEqual([
      'earlier',
      'later',
    ]);
  });
});

describe('filterEventMapMarkersByEventIds', () => {
  it('keeps selected events and removes empty markers', () => {
    const markers = buildEventMapMarkers([
      eventDetail('one', [race('one-race', 'Bagà', 'Barcelona', 42)]),
      eventDetail('two', [race('two-race', 'La Molina', 'Girona', 21)]),
    ], locations);

    const filtered = filterEventMapMarkersByEventIds(markers, new Set(['two']));

    expect(filtered).toHaveLength(1);
    expect(filtered[0].city).toBe('La Molina');
    expect(filtered[0].events.map((event) => event.id)).toEqual(['two']);
  });
});

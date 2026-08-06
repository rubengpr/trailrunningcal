import type { PublicEventDetail } from '@/types/event.types';
import type {
  EventMapLocation,
  EventMapLocationKey,
  EventMapMarker,
  EventMapPin,
} from '@/types/map.types';

export const PUBLIC_EVENT_LOCATION_BATCH_SIZE = 500;

export function eventMapLocationKey(
  city: string,
  province: string,
): string {
  return `${city.trim()}\u0000${province.trim()}`;
}

export function getEventMapLocationKeys(
  events: PublicEventDetail[],
): EventMapLocationKey[] {
  const locationsByKey = new Map<string, EventMapLocationKey>();

  for (const eventDetail of events) {
    for (const race of eventDetail.races) {
      const city = race.city.trim();
      const province = race.province.trim();
      if (city.length === 0 || province.length === 0) continue;

      locationsByKey.set(eventMapLocationKey(city, province), {
        city,
        province,
      });
    }
  }

  return [...locationsByKey.values()];
}

function coordinateKey(latitude: number, longitude: number): string {
  return `${latitude}|${longitude}`;
}

function toEventMapPin(
  eventDetail: PublicEventDetail,
  races: PublicEventDetail['races'],
): EventMapPin {
  return {
    id: eventDetail.event.id,
    name: eventDetail.event.name,
    slug: eventDetail.event.slug,
    dateRange: eventDetail.dateRange,
    location: eventDetail.location,
    distances: races.map((race) => ({
      id: race.id,
      distanceKm: race.distanceKm,
    })),
  };
}

function compareEventPins(a: EventMapPin, b: EventMapPin): number {
  const dateComparison = (a.dateRange.startDate ?? '9999-12-31').localeCompare(
    b.dateRange.startDate ?? '9999-12-31',
  );

  return dateComparison || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

export function buildEventMapMarkers(
  events: PublicEventDetail[],
  locations: EventMapLocation[],
): EventMapMarker[] {
  const locationsByKey = new Map(
    locations.map((location) => [
      eventMapLocationKey(location.city, location.province),
      location,
    ]),
  );
  const markersByKey = new Map<string, EventMapMarker>();

  for (const eventDetail of events) {
    const racesByLocation = new Map<string, PublicEventDetail['races']>();
    for (const race of eventDetail.races) {
      if (race.city.trim().length === 0 || race.province.trim().length === 0) {
        continue;
      }

      const key = eventMapLocationKey(race.city, race.province);
      const locationRaces = racesByLocation.get(key);
      if (locationRaces) {
        locationRaces.push(race);
      } else {
        racesByLocation.set(key, [race]);
      }
    }

    for (const [key, locationRaces] of racesByLocation) {
      const location = locationsByKey.get(key);
      if (!location) continue;

      const eventPin = toEventMapPin(eventDetail, locationRaces);
      const markerKey = coordinateKey(
        location.latitude,
        location.longitude,
      );
      const marker = markersByKey.get(markerKey);
      if (marker) {
        const existingEvent = marker.events.find(
          (event) => event.id === eventPin.id,
        );
        if (existingEvent) {
          const existingDistanceIds = new Set(
            existingEvent.distances.map((distance) => distance.id),
          );
          existingEvent.distances.push(
            ...eventPin.distances.filter(
              (distance) => !existingDistanceIds.has(distance.id),
            ),
          );
        } else {
          marker.events.push(eventPin);
        }
      } else {
        markersByKey.set(markerKey, {
          ...location,
          events: [eventPin],
        });
      }
    }
  }

  return [...markersByKey.values()].map((marker) => ({
    ...marker,
    events: marker.events.toSorted(compareEventPins),
  }));
}

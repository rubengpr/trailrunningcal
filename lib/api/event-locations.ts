import type {
  EventMapLocation,
  EventMapLocationKey,
  EventMapLocationsRequest,
  EventMapLocationsResult,
} from '@/types/map.types';

export async function getPublicEventLocations(
  locations: EventMapLocationKey[],
  signal?: AbortSignal,
): Promise<EventMapLocation[]> {
  const body: EventMapLocationsRequest = { locations };
  const response = await fetch('/api/event-locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to fetch event locations');
  }

  return (responseData.data as EventMapLocationsResult).locations;
}

import type { TrackRoute } from '@/types/race-track.types';
import type { Locale } from '@/i18n';

interface EventTrackRoutesResponse {
  success: true;
  data: {
    routes: TrackRoute[];
  };
}

export async function fetchEventTrackRoutes(
  eventId: string,
  locale: Locale,
): Promise<TrackRoute[]> {
  const response = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/tracks?locale=${encodeURIComponent(locale)}`,
  );
  if (!response.ok) {
    throw new Error('Failed to load event tracks');
  }

  const body = await response.json() as EventTrackRoutesResponse;
  return body.data.routes;
}

import { getLocale, getTranslations } from 'next-intl/server';
import { EventTrackMapExperience } from '@/components/event-track-map/event-track-map-experience';
import type { TrailEventRace } from '@/types/event.types';
import type { Locale } from '@/i18n';

interface EventTrackMapSectionProps {
  eventId: string;
  eventSlug: string;
  races: TrailEventRace[];
  trackedRaceIds: string[];
}

export async function EventTrackMapSection({
  eventId,
  eventSlug,
  races,
  trackedRaceIds,
}: EventTrackMapSectionProps) {
  const t = await getTranslations('event.trackMap');
  const locale = (await getLocale()) as Locale;
  if (!races.some((race) => trackedRaceIds.includes(race.id))) return null;
  return (
    <EventTrackMapExperience
      chartDescription={t('elevationProfile.chartDescription')}
      eventId={eventId}
      eventSlug={eventSlug}
      locale={locale}
      errorTitle={t('errorTitle')}
      errorMessage={t('errorMessage')}
      title={t('title')}
    />
  );
}

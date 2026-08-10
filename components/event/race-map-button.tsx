'use client';

import { useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmbedModal } from '@/components/ui/embed-modal';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import type { RaceMapProvider } from '@/lib/races/map-url';

interface RaceMapButtonProps {
  eventId: string;
  eventSlug: string;
  mapUrl: string;
  provider: RaceMapProvider;
  raceId: string;
  raceName: string;
}

export function RaceMapButton({
  eventId,
  eventSlug,
  mapUrl,
  provider,
  raceId,
  raceName,
}: RaceMapButtonProps) {
  const t = useTranslations('event.map');
  const [isOpen, setIsOpen] = useState(false);

  const openMap = (): void => {
    setIsOpen(true);
    track(ANALYTICS_EVENTS.EVENT_RACE_MAP_OPENED, {
      event_id: eventId,
      event_slug: eventSlug,
      provider,
      race_id: raceId,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openMap}
        className="-ml-2 inline-flex h-5.5 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none"
      >
        <MapIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
        {t('button')}
      </button>

      <EmbedModal
        className="block h-full min-h-0 w-full border-0 bg-gray-100 sm:h-[65vh] sm:min-h-96 sm:rounded-md lg:h-[75vh]"
        closeLabel={t('close')}
        embedTitle={t('iframeTitle', { raceName })}
        isOpen={isOpen}
        maxWidth="7xl"
        onClose={() => setIsOpen(false)}
        src={mapUrl}
        title={t('title', { raceName })}
      />
    </>
  );
}

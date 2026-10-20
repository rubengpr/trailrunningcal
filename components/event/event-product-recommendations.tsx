'use client';

import { useTranslations } from 'next-intl';
import { Backpack } from 'lucide-react';
import { RaceProductRecommendations } from '@/components/event/race-product-recommendation';
import { useProductRecommendationVariants } from '@/hooks/use-product-recommendation-variants';
import type { Locale } from '@/i18n';
import type { TrailEventRace } from '@/types/event.types';

interface EventProductRecommendationsProps {
  eventId: string;
  eventName: string;
  eventSlug: string;
  races: Pick<TrailEventRace, 'id' | 'name' | 'distanceKm' | 'elevationGainM'>[];
  locale: Locale;
}

export function EventProductRecommendations({ eventId, eventName, eventSlug, races, locale }: EventProductRecommendationsProps) {
  const t = useTranslations('event.productRecommendation');
  const { variant } = useProductRecommendationVariants();
  const eligibleRaces = races.filter((race) => Number.isFinite(race.distanceKm) && race.distanceKm > 0);
  if (!variant || eligibleRaces.length === 0) return null;

  const groups = eligibleRaces.map((race) => (
    <RaceProductRecommendations
      key={race.id}
      eventId={eventId}
      eventSlug={eventSlug}
      raceId={race.id}
      raceName={race.name ?? eventName}
      distanceKm={race.distanceKm}
      elevationGainM={race.elevationGainM}
      locale={locale}
    />
  ));

  // The control still measures reaching this location without leaving an empty section.
  if (variant === 'control') return <div>{groups}</div>;

  return (
    <section className="mt-16 sm:mt-20">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Backpack className="h-5 w-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-950 sm:text-2xl">{t('sectionTitle')}</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-gray-500">{t('sectionDescription')}</p>
      </div>
      <div className="space-y-4">{groups}</div>
    </section>
  );
}

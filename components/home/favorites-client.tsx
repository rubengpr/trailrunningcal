'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { TrailRace } from '@/types/race.types';
import { TrailRaceCard } from '@/components/race/trail-race-card';
import { useFavorites } from '@/hooks/use-favorites';
import { generateRaceSlug } from '@/lib/race-utils';
import { Heart } from 'lucide-react';

interface FavoritesClientProps {
  races: TrailRace[];
}

export function FavoritesClient({ races }: FavoritesClientProps) {
  const t = useTranslations('favorites');
  const locale = useLocale();
  const { favorites } = useFavorites();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const favoriteRaces = mounted ? races.filter((race) => favorites.has(race.id)) : [];

  if (!mounted) {
    return null;
  }

  if (favoriteRaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Heart className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
        <h2 className="text-xl font-semibold text-gray-700">{t('empty')}</h2>
        <p className="text-gray-500 max-w-sm">{t('emptyMessage')}</p>
        <Link
          href={`/${locale}`}
          className="mt-2 text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-600 transition-colors"
        >
          {t('backToCalendar')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 min-w-0">
      {favoriteRaces.map((race) => (
        <div key={race.id} className="min-w-0">
          <TrailRaceCard
            date={race.date}
            name={race.name}
            distanceKm={race.distanceKm}
            elevationGainM={race.elevationGainM}
            priceEur={race.priceEur ?? null}
            city={race.city}
            province={race.province}
            raceSlug={generateRaceSlug(race.name)}
            organizerId={race.organizerId}
          />
        </div>
      ))}
    </div>
  );
}

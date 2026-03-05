'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { TrailRace } from '@/types/race.types';
import TrailRaceCard from '@/components/race/trail-race-card';
import { useFavorites } from '@/hooks/use-favorites';
import { generateRaceSlug } from '@/lib/race-utils';

interface FavoritesClientProps {
  races: TrailRace[];
}

export default function FavoritesClient({ races }: FavoritesClientProps) {
  const t = useTranslations('favorites');
  const locale = useLocale();
  const { favorites } = useFavorites();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const favoriteRaces = mounted ? races.filter((race) => favorites.has(race.id)) : [];

  if (!mounted) {
    return null;
  }

  if (favoriteRaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-16 h-16 text-gray-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
          />
        </svg>
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
    <div className="grid gap-4">
      {favoriteRaces.map((race) => (
        <TrailRaceCard
          key={race.id}
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
      ))}
    </div>
  );
}

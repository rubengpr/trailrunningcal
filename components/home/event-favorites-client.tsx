'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import type { Locale } from '@/i18n';
import type { TrailEventDetail } from '@/types/event.types';
import { useEventFavorites } from '@/hooks/use-event-favorites';
import { formatEventDateRange } from '@/lib/events/utils';
import { getFavoriteEvents } from '@/lib/api/events';

export function EventFavoritesClient() {
  const t = useTranslations('favorites');
  const locale = useLocale() as Locale;
  const { favorites } = useEventFavorites();
  const [mounted, setMounted] = useState(false);
  const [favoriteEvents, setFavoriteEvents] = useState<TrailEventDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const favoriteIds = Array.from(favorites);

    if (favoriteIds.length === 0) {
      setFavoriteEvents([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let isActive = true;

    setIsLoading(true);
    setHasError(false);

    getFavoriteEvents(favoriteIds)
      .then((events) => {
        if (isActive) {
          setFavoriteEvents(events);
        }
      })
      .catch(() => {
        if (isActive) {
          setFavoriteEvents([]);
          setHasError(true);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [favorites, mounted]);

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <p className="py-10 text-sm text-gray-500">
        {t('loading')}
      </p>
    );
  }

  if (hasError) {
    return (
      <p className="py-10 text-sm text-gray-500">
        {t('loadError')}
      </p>
    );
  }

  if (favoriteEvents.length === 0) {
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
      {favoriteEvents.map((eventDetail) => {
        const location = eventDetail.location.isMultipleLocations
          ? t('multipleLocations')
          : [eventDetail.location.city, eventDetail.location.province]
              .filter(Boolean)
              .join(', ');

        return (
          <Link
            key={eventDetail.event.id}
            href={`/${locale}/e/${eventDetail.event.slug}`}
            className="block rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-gray-300"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-950">
                  {eventDetail.event.name}
                </h2>
                <span className="shrink-0 rounded-sm bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {t('distanceCount', { count: eventDetail.races.length })}
                </span>
              </div>
              <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                <span>
                  {formatEventDateRange(eventDetail.dateRange, locale, t('dateTbd'))}
                </span>
                {location && <span>{location}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

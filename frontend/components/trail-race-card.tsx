'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import VerifiedBadgeWithTooltip from './verified-badge-with-tooltip';
import { getDisplayPrice } from '@/lib/race-utils';
import { TEST_VERIFIED_RACES_NAME } from '@/lib/constants';

interface TrailRaceCardProps {
  date: string | null;
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur?: Array<{ price_eur: number }> | null;
  city: string;
  province: string;
  raceSlug?: string;
  organizerId: string | null;
  displayOnly?: boolean;
}

const formatDate = (dateString: string | null, locale: string) => {
  if (!dateString) {
    return { day: '-', month: '-', dayOfWeek: '-' };
  }
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString(locale, { month: 'short' });
  const dayOfWeek = date.toLocaleDateString(locale, { weekday: 'short' });
  return { day, month, dayOfWeek };
};

const calculateElevationRatio = (
  elevationGainM: number | null,
  distanceKm: number,
): number | null => {
  if (elevationGainM === null) return null;
  return Math.round(elevationGainM / distanceKm);
};

const getRaceCategory = (distanceKm: number): string => {
  if (distanceKm > 42) return 'ultra';
  if (distanceKm >= 42) return 'maraton';
  if (distanceKm >= 20) return 'media';
  if (distanceKm >= 10) return 'trail';
  return 'sprint';
};

const getElevationRatioColor = (ratio: number | null): string => {
  if (ratio === null) return 'bg-gray-100 text-gray-800';
  if (ratio < 40) return 'bg-green-100 text-green-800';
  if (ratio < 80) return 'bg-yellow-100 text-yellow-800';
  if (ratio < 120) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

export default function TrailRaceCard({
  date,
  name,
  distanceKm,
  elevationGainM,
  priceEur,
  city,
  province,
  raceSlug,
  organizerId,
  displayOnly = false,
}: TrailRaceCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { day, month, dayOfWeek } = formatDate(date, locale);
  const elevationRatio = calculateElevationRatio(elevationGainM, distanceKm);
  const raceCategory = getRaceCategory(distanceKm);
  const elevationRatioColor = getElevationRatioColor(elevationRatio);
  const displayPrice = getDisplayPrice(priceEur);

  const handleCardClick = () => {
    if (!displayOnly && raceSlug) {
      window.open(
        `/${locale}/carrera/${raceSlug}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  const isTestRace = TEST_VERIFIED_RACES_NAME.includes(name)

  return (
    <article
      onClick={displayOnly ? undefined : handleCardClick}
      className={`w-full bg-white rounded-lg shadow ${displayOnly
        ? ''
        : 'sm:hover:shadow-md transition-shadow sm:cursor-pointer pointer-events-none sm:pointer-events-auto'
        }`}
    >
      <div className="w-full p-2 sm:p-4">
        <div className="flex items-start sm:justify-between mb-1">
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center min-w-[50px] px-3 py-2 bg-amber-50 text-gray-800 rounded-sm">
              <span className="text-[8px] sm:text-[10px] font-medium uppercase tracking-wide">
                {dayOfWeek}
              </span>
              <span className="text-base sm:text-lg font-bold">{day}</span>
              <span className="text-[10px] sm:text-xs font-medium capitalize">
                {month}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex flex-row items-center gap-1.5 mb-1">
                <h3 className="text-xs sm:text-lg font-bold text-gray-900">
                  {name}
                </h3>
                {(organizerId || isTestRace) && (
                  <VerifiedBadgeWithTooltip size="sm" className="shrink-0" />
                )}
              </div>
              <div className="flex gap-3 text-[10px] sm:text-sm text-gray-600 mb-2">
                <span>{distanceKm}km</span>
                <span>{elevationGainM ? `${elevationGainM}m+` : '-'}</span>
                <span className="truncate">
                  {city}, {province}
                </span>
              </div>
              <div className="flex justify-start items-center gap-2">
                <span className="hidden sm:block px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-sm bg-gray-100 text-gray-800">
                  {t('category.' + raceCategory)}
                </span>
                <span
                  className={`hidden sm:block px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-sm ${elevationRatioColor}`}
                >
                  {elevationRatio !== null ? `${elevationRatio} m/km` : '—'}
                </span>

                {!displayOnly && raceSlug && (
                  <Link
                    href={`/${locale}/carrera/${raceSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:hidden inline-block pointer-events-auto bg-black text-white px-2 py-0.5 rounded-sm text-[10px] font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {t('race.webLink')}
                  </Link>
                )}
                <div className="block sm:hidden font-semibold text-gray-900 text-xs sm:text-lg">
                  {displayPrice ? `${displayPrice}€` : '—'}
                </div>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <div className="font-semibold text-gray-900 text-xs sm:text-lg">
              {displayPrice ? `${displayPrice}€` : '—'}
            </div>
            {!displayOnly && raceSlug && (
              <Link
                href={`/${locale}/carrera/${raceSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-block bg-black text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {t('race.webLink')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

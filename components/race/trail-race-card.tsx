'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VerifiedBadgeWithTooltip from '@/components/badges/verified-badge-with-tooltip';
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
  /** Tighter layout for narrow columns (e.g. home list beside map). */
  variant?: 'default' | 'compact';
  /** When set, called on card click instead of navigating to the race page. */
  onCardClick?: () => void;
}

const formatDate = (
  dateString: string | null,
  t: (key: string) => string
) => {
  if (!dateString) {
    return { day: '-', month: '-', dayOfWeek: '-' };
  }
  const date = new Date(dateString);
  const day = date.getDate();

  // Get numeric month and weekday
  const monthIndex = date.getMonth(); // 0-11
  const weekdayIndex = date.getDay(); // 0-6 (Sunday=0)

  // Map to translation keys
  const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const month = t(`months.${monthIndex}`);
  const dayOfWeek = t(`weekdays.${weekdayKeys[weekdayIndex]}`);

  return { day, month, dayOfWeek };
};

const calculateElevationRatio = (
  elevationGainM: number | null,
  distanceKm: number,
): number | null => {
  if (elevationGainM === null) return null;
  return Math.round(elevationGainM / distanceKm);
};

const getRaceCategory = (distanceKm: number, name: string, elevationGainM: number | null): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('marcha') || lowerName.includes('marxa') || lowerName.includes('caminada')) {
    return 'marcha';
  }
  const hasVkKeyword =
    lowerName.includes('kilómetro vertical') ||
    lowerName.includes('quilòmetre vertical') ||
    lowerName.includes('km vertical') ||
    lowerName.includes(' kv ') ||
    lowerName.startsWith('kv ') ||
    lowerName.endsWith(' kv');
  const hasVkRatio = distanceKm < 4 && elevationGainM !== null && elevationGainM >= 600;
  if (hasVkKeyword || hasVkRatio) return 'vk';
  if (distanceKm > 42) return 'ultra';
  if (distanceKm >= 42) return 'maraton';
  if (distanceKm >= 20) return 'media';
  if (distanceKm >= 10) return 'trail';
  return 'sprint';
};

const CATEGORY_SLUG: Record<string, string> = {
  ultra: 'ultra-trail',
  maraton: 'maraton',
  media: 'media-maraton',
  marcha: 'marcha',
  vk: 'km-vertical',
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
  variant = 'default',
  onCardClick,
}: TrailRaceCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { day, month, dayOfWeek } = formatDate(date, t);
  const elevationRatio = calculateElevationRatio(elevationGainM, distanceKm);
  const raceCategory = getRaceCategory(distanceKm, name, elevationGainM);
  const categorySlug = CATEGORY_SLUG[raceCategory] ?? null;
  const elevationRatioColor = getElevationRatioColor(elevationRatio);
  const displayPrice = getDisplayPrice(priceEur);

  const handleCardClick = () => {
    if (displayOnly) return;
    if (onCardClick) {
      onCardClick();
      return;
    }
    if (raceSlug) {
      router.push(`/${locale}/carrera/${raceSlug}`);
    }
  };

  const isTestRace = TEST_VERIFIED_RACES_NAME.includes(name);

  const isCompact = variant === 'compact';
  const innerPadding = isCompact
    ? 'px-3 py-2 sm:px-4 sm:py-2'
    : 'p-2 sm:p-4';
  const dateBlockClass = isCompact
    ? 'flex flex-col items-center justify-center min-w-[44px] px-2 py-1.5 bg-amber-50 text-gray-800 rounded-sm'
    : 'flex flex-col items-center justify-center min-w-[50px] px-3 py-2 bg-amber-50 text-gray-800 rounded-sm';
  const titleClass = isCompact
    ? 'text-xs sm:text-sm font-bold text-gray-900'
    : 'text-xs sm:text-lg font-bold text-gray-900';
  const dayNumClass = isCompact ? 'text-sm sm:text-base font-bold' : 'text-base sm:text-lg font-bold';
  const metaRowClass = isCompact ? 'flex gap-2 text-[11px] sm:text-xs text-gray-600 mb-1.5' : 'flex gap-3 text-xs sm:text-sm text-gray-600 mb-2';
  const mainGap = isCompact ? 'gap-3' : 'gap-4';

  return (
    <article
      onClick={displayOnly ? undefined : handleCardClick}
      className={`w-full bg-white rounded-lg shadow ${displayOnly
        ? ''
        : 'sm:hover:shadow-md transition-shadow sm:cursor-pointer pointer-events-none sm:pointer-events-auto'
        }`}
    >
      <div className={`w-full ${innerPadding}`}>
        <div className="flex items-start sm:justify-between mb-1">
          <div className={`flex ${mainGap}`}>
            <div className={dateBlockClass}>
              <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wide">
                {dayOfWeek}
              </span>
              <span className={dayNumClass}>{day}</span>
              <span className="text-xs font-medium capitalize">
                {month}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-row items-center gap-1.5 mb-1">
                {!displayOnly && raceSlug ? (
                  <Link
                    href={`/${locale}/carrera/${raceSlug}`}
                    className="pointer-events-auto hover:underline sm:hover:no-underline min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 className={`${titleClass} line-clamp-2`}>
                      {name}
                    </h2>
                  </Link>
                ) : (
                  <h2 className={`${titleClass} line-clamp-2`}>
                    {name}
                  </h2>
                )}
                <VerifiedBadgeWithTooltip
                  size="sm"
                  className={`shrink-0 ${(organizerId || isTestRace) ? 'visible' : 'invisible'}`}
                />
              </div>
              <div className={metaRowClass}>
                <span>{distanceKm}km</span>
                <span>{elevationGainM ? `${elevationGainM}m+` : '-'}</span>
                <span className="truncate">
                  {city},{' '}
                  <Link
                    href={`/${locale}/provincia/${province.toLowerCase()}`}
                    className="pointer-events-auto hover:underline sm:hover:no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {province}
                  </Link>
                </span>
              </div>
              <div className="flex justify-start items-center gap-2">
                {categorySlug ? (
                  <Link
                    href={`/${locale}/${categorySlug}`}
                    className="pointer-events-auto px-2 py-0.5 text-xs font-medium rounded-sm bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('category.' + raceCategory)}
                  </Link>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-sm bg-gray-100 text-gray-800">
                    {t('category.' + raceCategory)}
                  </span>
                )}
                <span
                  className={`hidden sm:block px-2 py-0.5 text-xs font-medium rounded-sm ${elevationRatioColor}`}
                >
                  {elevationRatio !== null ? `${elevationRatio} m/km` : '—'}
                </span>

                {!displayOnly && raceSlug && (
                  <Link
                    href={`/${locale}/carrera/${raceSlug}`}
                    className="sm:hidden inline-block pointer-events-auto bg-black text-white px-2 py-1 rounded-sm text-xs font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
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
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
            <div
              className={`font-semibold text-gray-900 ${isCompact ? 'text-xs sm:text-sm' : 'text-xs sm:text-lg'}`}
            >
              {displayPrice ? `${displayPrice}€` : '—'}
            </div>
            {!displayOnly && raceSlug && (
              <Link
                href={`/${locale}/carrera/${raceSlug}`}
                className={`hidden sm:inline-block bg-black text-white rounded-md font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors ${isCompact ? 'px-3 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
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

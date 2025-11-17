import { useTranslation } from 'react-i18next';

interface TrailRaceCardProps {
  date: string | null;
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur: number | null;
  city: string;
  province: string;
  websiteUrl: string | null;
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
  websiteUrl,
}: TrailRaceCardProps) {
  const { t, i18n } = useTranslation();
  const { day, month, dayOfWeek } = formatDate(date, i18n.language);
  const elevationRatio = calculateElevationRatio(elevationGainM, distanceKm);
  const raceCategory = getRaceCategory(distanceKm);
  const elevationRatioColor = getElevationRatioColor(elevationRatio);

  return (
    <article
      className="w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow"
      role="article"
      aria-labelledby={`race-title-${name.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="w-full p-2 sm:p-4">
        <div className="flex items-start sm:justify-between mb-1">
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center min-w-[50px] px-3 py-2 bg-indigo-100 text-indigo-700 rounded-sm">
              <span className="text-[8px] sm:text-[10px] font-medium uppercase tracking-wide">
                {dayOfWeek}
              </span>
              <span className="text-base sm:text-lg font-bold">{day}</span>
              <span className="text-[10px] sm:text-xs font-medium capitalize">
                {month}
              </span>
            </div>
            <div className="flex-1">
              <h3
                id={`race-title-${name.replace(/\s+/g, '-').toLowerCase()}`}
                className="text-xs sm:text-lg font-bold text-gray-900 mb-1"
              >
                {name}
              </h3>
              <div
                className="flex gap-3 text-[10px] sm:text-sm text-gray-600 mb-2"
                role="group"
                aria-label={t('race.details')}
              >
                <span aria-label={t('race.distance', { km: distanceKm })}>
                  {distanceKm}km
                </span>
                <span
                  aria-label={
                    elevationGainM
                      ? t('race.elevation', { meters: elevationGainM })
                      : t('race.elevationNotSpecified')
                  }
                >
                  {elevationGainM ? `${elevationGainM}m+` : '-'}
                </span>
                <span
                  className="truncate"
                  aria-label={t('race.location', { city, province })}
                >
                  {city}, {province}
                </span>
              </div>
              <div className="flex justify-start items-center gap-2">
                <span
                  className="hidden sm:block px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-sm bg-indigo-100 text-indigo-800"
                  aria-label={t('race.category', {
                    category: t(`category.${raceCategory}`),
                  })}
                >
                  {t(`category.${raceCategory}`)}
                </span>
                <span
                  className={`hidden sm:block px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-sm ${elevationRatioColor}`}
                  aria-label={
                    elevationRatio !== null
                      ? t('race.elevationRatio', { ratio: elevationRatio })
                      : t('race.elevationRatioNotSpecified')
                  }
                >
                  {elevationRatio !== null ? `${elevationRatio} m/km` : '—'}
                </span>

                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('race.visitWebsite', { name })}
                    className="sm:hidden inline-block bg-indigo-600 text-white px-2 py-0.5 rounded-sm text-[10px] font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    {t('race.webLink')}
                  </a>
                )}
                <div
                  className="block sm:hidden font-semibold text-gray-900 text-xs sm:text-lg"
                  aria-label={
                    priceEur
                      ? t('race.price', { price: priceEur })
                      : t('race.priceNotSpecified')
                  }
                >
                  {priceEur ? `${priceEur}€` : '—'}
                </div>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <div
              className="font-semibold text-gray-900 text-xs sm:text-lg"
              aria-label={
                priceEur
                  ? t('race.price', { price: priceEur })
                  : t('race.priceNotSpecified')
              }
            >
              {priceEur ? `${priceEur}€` : '—'}
            </div>
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('race.visitWebsite', { name })}
                className="hidden sm:inline-block bg-indigo-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                {t('race.webLink')}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}


import { getTranslations } from 'next-intl/server';
import { ConfirmedDateBadge } from '@/components/race/confirmed-date-badge';
import VerifiedBadgeWithTooltip from '@/components/badges/verified-badge-with-tooltip';
import RaceOrganizerLinks from '@/components/race/race-organizer-links';
import RaceShareWhatsappButton from '@/components/race/race-share-whatsapp-button';
import { RaceFavoriteButton } from '@/components/race/race-favorite-button';
import { TrackedLink } from '@/components/ui/tracked-link';
import { BASE_URL } from '@/lib/config';
import { TEST_VERIFIED_RACES_NAME } from '@/lib/constants';
import type { TrailRace } from '@/types/race.types';
import type { OrganizerPublic } from '@/types/organizer.types';

interface RaceDetailHeaderProps {
  race: TrailRace;
  raceSlug: string;
  locale: string;
  organizer: OrganizerPublic | null;
  formattedDate: string;
  provinceSlug: string | null;
  categorySlug: string | null;
  raceCategory: string | null;
  displayPrice: number | null;
}

export async function RaceDetailHeader({
  race,
  raceSlug,
  locale,
  organizer,
  formattedDate,
  provinceSlug,
  categorySlug,
  raceCategory,
  displayPrice,
}: RaceDetailHeaderProps) {
  const tRace = await getTranslations({ locale, namespace: 'race' });
  const tProvincia = await getTranslations({ locale, namespace: 'provincia' });
  const tCategory = await getTranslations({ locale, namespace: 'category' });

  const isVerified = !!(race.organizerId || TEST_VERIFIED_RACES_NAME.includes(race.name));

  return (
    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
      <div className="flex flex-col flex-1 gap-1.5 sm:gap-1">
        <div className="flex flex-row items-center gap-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
            {race.name}
          </h1>
          {isVerified && (
            <VerifiedBadgeWithTooltip size="md" className="shrink-0" />
          )}
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <span className="text-sm sm:text-base lg:text-lg font-semibold text-black whitespace-nowrap">
            {formattedDate}
          </span>
          {race.date && <ConfirmedDateBadge locale={locale} />}
          {categorySlug && raceCategory && (
            <TrackedLink
              href={`/${locale}/${categorySlug}`}
              eventName="race_category_link_clicked"
              eventProperties={{ race_id: race.id, race_slug: raceSlug, category: raceCategory }}
              className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-sm bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
            >
              {tCategory(raceCategory)}
            </TrackedLink>
          )}
        </div>
        <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 text-sm lg:text-base text-gray-600">
          <div className="flex flex-row gap-1">
            <span className="whitespace-nowrap">{race.city},</span>
            {provinceSlug ? (
              <TrackedLink
                href={`/${locale}/provincia/${provinceSlug}`}
                eventName="race_province_inline_clicked"
                eventProperties={{ race_id: race.id, race_slug: raceSlug, province: race.province }}
                className="whitespace-nowrap hover:underline"
              >
                {race.province}
              </TrackedLink>
            ) : (
              <span className="whitespace-nowrap">{race.province}</span>
            )}
          </div>
          <div className="flex flex-row gap-2">
            <span className="whitespace-nowrap">{race.distanceKm}km</span>
            {race.elevationGainM !== null && (
              <span className="whitespace-nowrap">+{race.elevationGainM}m</span>
            )}
            {displayPrice && (
              <span className="whitespace-nowrap">· {displayPrice}€</span>
            )}
          </div>
        </div>
        {organizer && (
          <div className="mt-1">
            <RaceOrganizerLinks
              organizer={organizer}
              raceId={race.id}
              raceSlug={raceSlug}
            />
          </div>
        )}
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
        <div className="flex w-full flex-col gap-2">
          {race.websiteUrl && (
            <TrackedLink
              href={race.websiteUrl}
              eventName="race_official_website_clicked"
              eventProperties={{ race_id: race.id, race_slug: raceSlug }}
              external
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none transition-colors cursor-pointer text-center whitespace-nowrap"
            >
              {tRace('officialWebsite')}
            </TrackedLink>
          )}
          <div className="flex flex-row gap-2">
            <RaceShareWhatsappButton
              message={tRace('share.message', { raceName: race.name, url: `${BASE_URL}/${locale}/carrera/${raceSlug}` })}
              label={tRace('share.label')}
              iconOnly
              className="flex-1"
              raceId={race.id}
              raceSlug={raceSlug}
            />
            <RaceFavoriteButton
              raceId={race.id}
              saveLabel={tRace('favorite.save')}
              removeLabel={tRace('favorite.remove')}
              iconOnly
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { locales } from '@/i18n';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateRaceSlug } from '@/lib/race-utils';
import type { Metadata } from 'next';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { BASE_URL } from '@/lib/config';
import { buildRaceAlternateLinks } from '@/lib/alternate-links';
import VerifiedBadgeWithTooltip from '@/components/badges/verified-badge-with-tooltip';
import { ConfirmedDateBadge } from '@/components/race/confirmed-date-badge';
import Sponsors from '@/components/home/sponsors';
import { RaceHeroImage } from '@/components/race/race-hero-image';
import { RaceOrganizerClaimCard } from '@/components/race/race-organizer-claim-card';
import { TEST_VERIFIED_RACES_NAME } from '@/lib/constants';
import { getRaces } from '@/lib/db/races';
import { getOrganizerById } from '@/lib/db/organizers';
import { getDisplayPrice } from '@/lib/race-utils';
import RaceOrganizerLinks from '@/components/race/race-organizer-links';
import RaceShareWhatsappButton from '@/components/race/race-share-whatsapp-button';
import { RaceFavoriteButton } from '@/components/race/race-favorite-button';
import { buildRaceJsonLd } from '@/lib/seo/race-json-ld';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import ProvinceLink from '@/components/filters/province-link';
import { getRaceImageUrlWithFilename } from '@/lib/race-image-url';

const PROVINCE_SLUGS: Record<string, string> = {
  Barcelona: 'barcelona',
  Girona: 'girona',
  Lleida: 'lleida',
  Tarragona: 'tarragona',
};

const STOCK_IMAGES_COUNT = 21;
const STOCK_IMAGE_BASE_URL = 'https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/stock/images';

function stockImageUrlForRace(raceId: string): string {
  const hash = [...raceId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = (hash % STOCK_IMAGES_COUNT) + 1;
  return `${STOCK_IMAGE_BASE_URL}/image-${index}.jpg`;
}

const PROVINCE_IMAGES: Record<string, string> = {
  Barcelona: 'https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/stock/provinces/barcelona.jpg',
  Girona: 'https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/stock/provinces/girona.jpg',
  Lleida: 'https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/stock/provinces/lleida.jpg',
  Tarragona: 'https://ppmdbmyxgtqvmvtbptmg.supabase.co/storage/v1/object/public/stock/provinces/tarragona.jpg',
};

export const revalidate = 3600; // 1 hour

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; race: string }>;
}): Promise<Metadata> {
  const { locale, race } = await params;

  const races = await getRaces();
  const raceData = races.find((r) => generateRaceSlug(r.name) === race);

  // If race doesn't exist, return minimal metadata (Next.js will handle 404)
  if (!raceData) {
    return {
      title: 'Race Not Found',
    };
  }

  if (!locales.includes(locale as Locale)) {
    return {
      title: 'Race Not Found',
    };
  }

  const localeTyped = locale as Locale;

  // Extract year from date (YYYY-MM-DD format) or use current year if date is null
  const year = raceData.date
    ? new Date(raceData.date).getFullYear()
    : new Date().getFullYear();

  // Generate title: "{Race Name} {Year} - Trail Running en/a {City}"
  const preposition = localeTyped === 'ca' ? 'a' : 'en';
  const title = `${raceData.name} ${year} - Trail Running ${preposition} ${raceData.city}`;

  // Format date for description
  const formattedDate = raceData.date
    ? localeTyped === 'ca'
      ? formatDateToCatalan(raceData.date)
      : formatDateToSpanish(raceData.date)
    : localeTyped === 'ca'
      ? 'Data per confirmar'
      : 'Fecha por confirmar';

  // Generate description with race details
  const elevationText =
    raceData.elevationGainM !== null
      ? localeTyped === 'ca'
        ? `amb ${raceData.elevationGainM}m de desnivell positiu`
        : `con ${raceData.elevationGainM}m de desnivel positivo`
      : '';

  const description =
    localeTyped === 'ca'
      ? `Cursa de trail running de ${raceData.distanceKm}km${elevationText ? ` ${elevationText}` : ''
      } a ${raceData.city}, ${raceData.province}. Data: ${formattedDate}`
      : `Carrera de trail running de ${raceData.distanceKm}km${elevationText ? ` ${elevationText}` : ''
      } en ${raceData.city}, ${raceData.province}. Fecha: ${formattedDate}`;

  // Build canonical URL
  const canonicalUrl = `${BASE_URL}/${localeTyped}/carrera/${race}`;

  // Use default OG image
  const ogImageUrl = `${BASE_URL}/og-image.png`;

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl,
    locale: localeTyped,
    ogImageUrl,
    ogImageAlt: raceData.name,
    ogType: 'website',
    alternateLinks: buildRaceAlternateLinks(race),
  });
}

const isTestRace = (raceName: string) => TEST_VERIFIED_RACES_NAME.includes(raceName)

export default async function RacePage({
  params,
}: {
  params: Promise<{ locale: string; race: string }>;
}) {
  const { locale, race } = await params;

  // Fetch fresh race data on each request
  const races = await getRaces();
  const raceData = races.find((r) => generateRaceSlug(r.name) === race);
  const displayPrice = getDisplayPrice(raceData?.priceEur);

  if (!raceData) {
    notFound();
  }

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const tRace = await getTranslations({ locale, namespace: 'race' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tProvincia = await getTranslations({ locale, namespace: 'provincia' });
  const tCategory = await getTranslations({ locale, namespace: 'category' });

  const organizer = raceData.organizerId
    ? await getOrganizerById(raceData.organizerId)
    : null;

  const formattedDate = raceData.date
    ? locale === 'ca'
      ? formatDateToCatalan(raceData.date)
      : formatDateToSpanish(raceData.date)
    : '-';

  const heroImageUrl =
    raceData.organizerId && raceData.heroImageFilename
      ? getRaceImageUrlWithFilename(raceData.organizerId, raceData.id, raceData.heroImageFilename)
      : null;

  const jsonLd = buildRaceJsonLd(raceData, race, locale as Locale);
  const provinceSlug = PROVINCE_SLUGS[raceData.province] ?? null;

  const CATEGORY_SLUG: Record<string, string> = {
    ultra: 'ultra-trail',
    maraton: 'maraton',
    media: 'media-maraton',
  };
  const raceCategory =
    raceData.distanceKm > 42 ? 'ultra' :
    raceData.distanceKm >= 42 ? 'maraton' :
    raceData.distanceKm >= 20 ? 'media' : null;
  const categorySlug = raceCategory ? CATEGORY_SLUG[raceCategory] : null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    ...(provinceSlug
      ? [
          {
            name: tProvincia(`names.${provinceSlug}`),
            url: `${BASE_URL}/${locale}/provincia/${provinceSlug}`,
          },
        ]
      : []),
    { name: raceData.name, url: `${BASE_URL}/${locale}/carrera/${race}` },
  ]);

  const recommendedRaces = races
    .filter((r) => {
      if (r.province !== raceData.province || r.id === raceData.id) return false;
      if (!raceData.date) return !!r.date;
      return !!r.date && r.date >= raceData.date;
    })
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 3)
    .map((r) => ({
      href: `/${locale}/carrera/${generateRaceSlug(r.name)}`,
      label: r.name,
      imageSrc: stockImageUrlForRace(r.id),
    }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <div className="flex flex-col max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          <div className="flex flex-col flex-1 gap-2">
            <Breadcrumb
              items={[
                { name: tNav('calendar'), href: `/${locale}` },
                ...(provinceSlug
                  ? [{ name: tProvincia(`names.${provinceSlug}`), href: `/${locale}/provincia/${provinceSlug}` }]
                  : []),
                { name: raceData.name },
              ]}
            />
            <div className="flex flex-row items-center gap-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                {raceData.name}
              </h1>
              {categorySlug && raceCategory && (
                <Link
                  href={`/${locale}/${categorySlug}`}
                  className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-sm bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  {tCategory(raceCategory)}
                </Link>
              )}
              {(raceData.organizerId || isTestRace(raceData.name)) && (
                <VerifiedBadgeWithTooltip size="md" className="shrink-0" />
              )}
            </div>
            <div className="flex flex-row items-center gap-2">
              <span className="text-base sm:text-lg lg:text-xl font-bold text-black whitespace-nowrap">
                {formattedDate}
              </span>
              {raceData.date && <ConfirmedDateBadge locale={locale} />}
            </div>
            <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 text-gray-600">
              <div className="flex flex-row gap-1">
                <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                  {raceData.city},
                </span>
                {provinceSlug ? (
                  <Link
                    href={`/${locale}/provincia/${provinceSlug}`}
                    className="text-base sm:text-lg lg:text-xl whitespace-nowrap hover:underline"
                  >
                    {raceData.province}
                  </Link>
                ) : (
                  <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    {raceData.province}
                  </span>
                )}
              </div>
              <div className="flex flex-row gap-2">
                <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                  {raceData.distanceKm}km
                </span>
                {raceData.elevationGainM !== null && (
                  <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    +{raceData.elevationGainM}m
                  </span>
                )}
                {displayPrice && (
                  <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    · {displayPrice}€
                  </span>
                )}
              </div>
            </div>
            {organizer && (
              <div className="mt-1">
                <RaceOrganizerLinks organizer={organizer} />
              </div>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex w-full flex-col gap-2">
              {raceData.websiteUrl && (
                <a
                  href={raceData.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none transition-colors cursor-pointer text-center whitespace-nowrap"
                >
                  {tRace('officialWebsite')}
                </a>
              )}
              <div className="flex flex-row gap-2">
                <RaceShareWhatsappButton
                  message={tRace('share.message', { raceName: raceData.name, url: `${BASE_URL}/${locale}/carrera/${race}` })}
                  label={tRace('share.label')}
                  iconOnly
                  className="flex-1"
                />
                <RaceFavoriteButton
                  raceId={raceData.id}
                  saveLabel={tRace('favorite.save')}
                  removeLabel={tRace('favorite.remove')}
                  iconOnly
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
        {heroImageUrl && (
          <RaceHeroImage imageUrl={heroImageUrl} alt={raceData.name} />
        )}
        <div className="w-full my-6 sm:my-8">
          {raceData.description && (
            <p className="text-sm sm:text-base lg:text-lg whitespace-pre-line">
              {raceData.description}
            </p>
          )}
        </div>
        {raceData.organizerId && raceData.sponsors && (
          <Sponsors sponsors={raceData.sponsors} />
        )}
        {raceData.mapUrl && (
          <iframe
            className="mb-4"
            src={raceData.mapUrl}
            width="100%"
            height="700"
            frameBorder="0"
            scrolling="no"
          ></iframe>
        )}

        {/*{Array.isArray(raceData.priceEur) && (
          <PriceTiersTable
            tiers={raceData.priceEur}
            locale={locale as Locale}
          />
        )}*/}

        {/*{raceData.organizerId &&
          raceData.services &&
          raceData.services.length > 0 && (
            <RaceServicesList
              services={raceData.services}
              locale={locale as Locale}
            />
          )}*/}

        {/*{raceData.organizerId &&
          raceData.resultsUrls &&
          raceData.resultsUrls.length > 0 && (
            <RaceResultsUrls
              resultsUrls={raceData.resultsUrls}
              locale={locale as Locale}
            />
          )}*/}

        {provinceSlug && (
          <ProvinceLink
            label={tRace('provincia.racePageLabel', { province: raceData.province })}
            linkText={tRace('provincia.racePageLinkText', { province: raceData.province })}
            href={`/${locale}/provincia/${provinceSlug}`}
            imageSrc={PROVINCE_IMAGES[raceData.province]}
            additionalCards={recommendedRaces}
          />
        )}
        {!raceData.organizerId && (
          <div className="mt-10">
            <RaceOrganizerClaimCard
              label={tRace('organizerCard.label')}
              claimButton={tRace('organizerCard.claimButton')}
              raceName={raceData.name}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}

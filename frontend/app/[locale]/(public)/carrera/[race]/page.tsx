import { locales } from '@/i18n';
import { notFound } from 'next/navigation';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateRaceSlug } from '@/lib/race-utils';
import type { Metadata } from 'next';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { BASE_URL } from '@/lib/config';
import { buildRaceAlternateLinks } from '@/lib/alternate-links';
import VerifiedBadgeWithTooltip from '@/components/verified-badge-with-tooltip';
import { ConfirmedDateBadge } from '@/components/confirmed-date-badge';
//import PriceTiersTable from '@/components/price-tiers-table';
//import RaceServicesList from '@/components/race-services-list';
//import RaceResultsUrls from '@/components/race-results-urls';
import Sponsors from '@/components/sponsors';
import { RaceHeroImage } from '@/components/race-hero-image';
import { RaceOrganizerClaimCard } from '@/components/race-organizer-claim-card';
import { TEST_VERIFIED_RACES_NAME } from '@/lib/constants';
import { getRaces } from '@/lib/db/races';
import { getOrganizerById } from '@/lib/db/organizers';
import { getDisplayPrice } from '@/lib/race-utils';
import RaceOrganizerLinks from '@/components/race-organizer-links';
import RaceShareWhatsappButton from '@/components/race-share-whatsapp-button';
import { buildRaceJsonLd } from '@/lib/seo/race-json-ld';
import { buildBreadcrumbJsonLd } from '@/lib/seo/breadcrumb-json-ld';
import ProvinceLink from '@/components/province-link';
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
          <div className="flex flex-col flex-1">
            <div className="flex flex-row items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                {raceData.name}
              </h1>
              {(raceData.organizerId || isTestRace(raceData.name)) && (
                <VerifiedBadgeWithTooltip size="md" className="shrink-0 self-start" />
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap text-gray-600 gap-2 sm:gap-3">
              <div className="flex flex-row items-center gap-2">
                <span className="text-base sm:text-lg lg:text-xl font-bold text-black whitespace-nowrap">
                  {formattedDate}
                </span>
                {raceData.date && <ConfirmedDateBadge locale={locale} />}
              </div>
              <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
                <div className="flex flex-row gap-1">
                  <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    {raceData.city},
                  </span>
                  <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    {raceData.province}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-base sm:text-lg lg:text-xl">|</span>
                </div>
                <div className="flex flex-row gap-1">
                  <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    {raceData.distanceKm}km
                  </span>
                  {raceData.elevationGainM !== null && (
                    <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                      +{raceData.elevationGainM}m
                    </span>
                  )}
                </div>
                {displayPrice &&
                  <>
                    <div className="hidden sm:block">
                      <span className="text-base sm:text-lg lg:text-xl">|</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-base sm:text-lg lg:text-xl whitespace-nowrap">
                        {displayPrice}€
                      </span>
                    </div>
                  </>
                }
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex w-full flex-row items-center gap-2 sm:flex-col">
              {raceData.websiteUrl && (
                <a
                  href={raceData.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none transition-colors cursor-pointer text-center whitespace-nowrap sm:flex-none sm:w-full"
                >
                  {tRace('officialWebsite')}
                </a>
              )}
              <RaceShareWhatsappButton
                message={tRace('share.message', { raceName: raceData.name, url: `${BASE_URL}/${locale}/carrera/${race}` })}
                label={tRace('share.label')}
              />
            </div>
            {organizer && (
              <RaceOrganizerLinks organizer={organizer} />
            )}
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

        {!raceData.organizerId && (
          <RaceOrganizerClaimCard
            title={tRace('organizerCard.title')}
            titleMobile={tRace('organizerCard.titleMobile')}
            description={tRace('organizerCard.description')}
            descriptionMobile={tRace('organizerCard.descriptionMobile')}
            benefits={tRace('organizerCard.benefits')}
            claimButton={tRace('organizerCard.claimButton')}
            raceName={raceData.name}
          />
        )}
        {provinceSlug && (
          <ProvinceLink
            label={tRace('provincia.racePageLabel', { province: raceData.province })}
            linkText={tRace('provincia.racePageLinkText', { province: raceData.province })}
            href={`/${locale}/provincia/${provinceSlug}`}
            imageSrc={PROVINCE_IMAGES[raceData.province]}
            additionalCards={recommendedRaces}
          />
        )}
      </div>
    </div>
    </>
  );
}

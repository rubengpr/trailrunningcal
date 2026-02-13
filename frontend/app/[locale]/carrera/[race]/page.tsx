import Navbar from '@/components/navbar';
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
//import PriceTiersTable from '@/components/price-tiers-table';
//import RaceServicesList from '@/components/race-services-list';
//import RaceResultsUrls from '@/components/race-results-urls';
import Image from 'next/image';
import Sponsors from '@/components/sponsors';
import { RaceOrganizerClaimCard } from '@/components/race-organizer-claim-card';
import { TEST_VERIFIED_RACES_NAME } from '@/lib/constants';
import { getRaces } from '@/lib/db/races';
import { getDisplayPrice } from '@/lib/race-utils';

export async function generateStaticParams() {
  // Use static client for static generation
  const races = await getRaces(true);

  const params = locales.flatMap((locale) =>
    races.map((race) => ({
      locale,
      race: generateRaceSlug(race.name),
    })),
  );
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; race: string }>;
}): Promise<Metadata> {
  const { locale, race } = await params;

  // Use static client for static generation
  const races = await getRaces(true);
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

  // Generate title: "{Race Name} - Trail Running en/a {City} ({Year})"
  const preposition = localeTyped === 'ca' ? 'a' : 'en';
  const title = `${raceData.name} - Trail Running ${preposition} ${raceData.city} (${year})`;

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

  // Use static client since this page is statically generated via generateStaticParams
  const races = await getRaces(true);
  const raceData = races.find((r) => generateRaceSlug(r.name) === race);
  const displayPrice = getDisplayPrice(raceData?.priceEur);

  if (!raceData) {
    notFound();
  }

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Get translations for the race page
  const tRace = await getTranslations({ locale, namespace: 'race' });

  const formattedDate = raceData.date
    ? locale === 'ca'
      ? formatDateToCatalan(raceData.date)
      : formatDateToSpanish(raceData.date)
    : '-';

  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <Navbar />
      <div className="flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-20 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
          <div className="flex flex-col">
            <div className="flex flex-row items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                {raceData.name}
              </h1>
              {(raceData.organizerId || isTestRace(raceData.name)) && (
                <VerifiedBadgeWithTooltip size="md" />
              )}
            </div>
            <div className="flex flex-col sm:flex-row text-gray-600 gap-2 sm:gap-3">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-black">
                {formattedDate}
              </h3>
              <div className="flex flex-row gap-2 sm:gap-3">
                <div className="flex flex-row gap-1">
                  <h3 className="text-base sm:text-lg lg:text-xl">
                    {raceData.city},
                  </h3>
                  <h3 className="text-base sm:text-lg lg:text-xl">
                    {raceData.province}
                  </h3>
                </div>
                <div className="hidden sm:block">
                  <h3 className="text-base sm:text-lg lg:text-xl">|</h3>
                </div>
                <div className="flex flex-row gap-1">
                  <h3 className="text-base sm:text-lg lg:text-xl">
                    {raceData.distanceKm}km
                  </h3>
                  {raceData.elevationGainM !== null && (
                    <h3 className="text-base sm:text-lg lg:text-xl">
                      +{raceData.elevationGainM}m
                    </h3>
                  )}
                </div>
                {displayPrice &&
                  <>
                    <div className="hidden sm:block">
                      <h3 className="text-base sm:text-lg lg:text-xl">|</h3>
                    </div>
                    <div className="hidden sm:block">
                      <h3 className="text-base sm:text-lg lg:text-xl">
                        {displayPrice}€
                      </h3>
                    </div>
                  </>
                }
              </div>
            </div>
          </div>
          {raceData.websiteUrl && (
            <div className="w-full sm:w-auto">
              <a
                href={raceData.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none transition-colors cursor-pointer inline-block w-full sm:w-auto text-center"
              >
                Web oficial
              </a>
            </div>
          )}
        </div>
        {raceData.organizerId && raceData.imagePath && (
          <div className="mt-6 sm:mt-8 w-full relative aspect-video sm:aspect-21/9 lg:aspect-16/7 rounded-lg overflow-hidden">
            <Image
              src={raceData.imagePath}
              alt={raceData.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1200px"
            />
          </div>
        )}
        <div className="w-full my-6 sm:my-8">
          {raceData.organizerId && raceData.description && (
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

        <RaceOrganizerClaimCard
          title={tRace('organizerCard.title')}
          titleMobile={tRace('organizerCard.titleMobile')}
          description={tRace('organizerCard.description')}
          descriptionMobile={tRace('organizerCard.descriptionMobile')}
          benefits={tRace('organizerCard.benefits')}
          claimButton={tRace('organizerCard.claimButton')}
          raceName={raceData.name}
        />
      </div>
    </div>
  );
}

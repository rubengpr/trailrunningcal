import type { Metadata } from 'next';
import { createHash } from 'node:crypto';
import { Route } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { getEventBySlug, getRecommendedEvents } from '@/lib/db/events';
import { buildEventAlternateLinks } from '@/lib/content/alternate-links';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { SponsorBannerSlot } from '@/components/sponsors/sponsor-banner-slot';
import { EventDiscoverySection } from '@/components/event/event-discovery-section';
import { EventDistanceList } from '@/components/event/event-distance-list';
import { EventDetailHeader } from '@/components/event/event-detail-header';
import { EventFeatureFeedback } from '@/components/event/event-feature-feedback';
import { EventPageViewTracker } from '@/components/event/event-page-view-tracker';
import { EventResultsAccordion } from '@/components/event/event-results-accordion';
import { EventTrackMapSection } from '@/components/event-track-map/event-track-map-section';
import { RaceOrganizerClaimCard } from '@/components/race/race-organizer-claim-card';
import {
  formatEventDateRange,
  formatEventLocationLabel,
  shouldShowEventResults,
  toPublicEventDetail,
} from '@/lib/events/utils';
import { buildBreadcrumbJsonLd, buildEventJsonLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/json-ld';
import { LOCALE_BY_LANGUAGE, SITE_NAME } from '@/lib/seo/meta-config';
import { getDestinationPath, getProvinceByDbName } from '@/lib/geography/destinations';
import type { EventTranslationLocale } from '@/types/event-translation.types';
import type { PublicEventDetail } from '@/types/event.types';

export const revalidate = 604800;

export function generateStaticParams() {
  return [];
}

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

function getRenderFingerprint(
  eventData: Awaited<ReturnType<typeof getEventBySlug>>,
  recommendedEvents: PublicEventDetail[],
): string {
  return createHash('sha256').update(JSON.stringify({
    event: eventData?.event,
    races: eventData?.races,
    dateRange: eventData?.dateRange,
    location: eventData?.location,
    recommendedEvents: recommendedEvents.map(({ event, races, dateRange, location }) => ({
      event,
      races,
      dateRange,
      location,
    })),
  })).digest('hex').slice(0, 16);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; event: string }>;
}): Promise<Metadata> {
  const { locale, event } = await params;

  if (!locales.includes(locale as Locale)) {
    return {
      title: 'Event Not Found',
    };
  }

  const localeTyped = locale as Locale;
  const eventData = await getEventBySlug(
    event,
    localeTyped === 'es' ? undefined : localeTyped,
  );

  if (!eventData) {
    return {
      title: 'Event Not Found',
    };
  }

  const year = eventData.dateRange.startDate
    ? Number(eventData.dateRange.startDate.slice(0, 4))
    : new Date().getFullYear();
  const title = `${eventData.event.name} ${year} - ${SITE_NAME}`;
  const canonicalUrl = `${BASE_URL}/${localeTyped}/e/${event}`;
  const description = eventData.event.description ?? undefined;

  return {
    title,
    ...(description && { description }),
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: buildEventAlternateLinks(event),
    },
    openGraph: {
      type: 'website',
      title,
      ...(description && { description }),
      url: canonicalUrl,
      locale: LOCALE_BY_LANGUAGE[localeTyped],
      siteName: SITE_NAME,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: eventData.event.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      ...(description && { description }),
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: string; event: string }>;
}) {
  const { locale, event } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const eventData = await getEventBySlug(
    event,
    locale === 'es' ? undefined : locale as EventTranslationLocale,
  );

  if (!eventData) {
    notFound();
  }

  const localeTyped = locale as Locale;
  const [tEvent, tNav, tProvincia] = await Promise.all([
    getTranslations({ locale, namespace: 'event' }),
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale, namespace: 'provincia' }),
  ]);

  const formattedDate = formatEventDateRange(
    eventData.dateRange,
    localeTyped,
    tEvent('dateTbd'),
  );
  const locationLabel = formatEventLocationLabel(eventData.location, locale as Locale);
  const showResults = shouldShowEventResults(eventData.races);
  const resultsYear = eventData.dateRange.startDate?.slice(0, 4)
    ?? new Date().getFullYear().toString();

  const destinationProvince =
    !eventData.location.isMultipleLocations && eventData.location.province
      ? getProvinceByDbName(eventData.location.province)
      : null;
  const provinceDestination = destinationProvince
    ? {
      regionId: destinationProvince.province.regionId,
      provinceId: destinationProvince.id,
    }
    : null;
  const recommendedEvents = eventData.location.province
    ? await getRecommendedEvents(
      eventData.location.province,
      eventData.event.id,
      eventData.dateRange.startDate,
      7,
    )
    : [];
  const publicRecommendedEvents = recommendedEvents.map(toPublicEventDetail);

  console.info(JSON.stringify({
    level: 'info',
    message: 'isr_event_page_render',
    eventId: eventData.event.id,
    eventSlug: event,
    locale: localeTyped,
    fingerprint: getRenderFingerprint(eventData, publicRecommendedEvents),
    recommendedEventIds: recommendedEvents.map(({ event: recommendation }) => recommendation.id),
  }));

  const jsonLd = buildEventJsonLd(eventData, event, localeTyped);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    ...(provinceDestination
      ? [
        {
          name: tProvincia(`names.${provinceDestination.provinceId}`),
          url: `${BASE_URL}${getDestinationPath(
            locale,
            provinceDestination.regionId,
            provinceDestination.provinceId,
          )}`,
        },
      ]
      : []),
    { name: eventData.event.name, url: `${BASE_URL}/${locale}/e/${event}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
        <EventPageViewTracker
          eventId={eventData.event.id}
          eventSlug={event}
          locale={localeTyped}
          province={eventData.location.province}
          region={provinceDestination?.regionId ?? null}
        />
        <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { name: tNav('calendar'), href: `/${locale}` },
              ...(provinceDestination
                ? [
                  {
                    name: tProvincia(`names.${provinceDestination.provinceId}`),
                    href: getDestinationPath(
                      locale,
                      provinceDestination.regionId,
                      provinceDestination.provinceId,
                    ),
                  },
                ]
                : []),
              { name: eventData.event.name },
            ]}
            captureContext={{ page: 'event', event_id: eventData.event.id, event_slug: event }}
          />

          <EventDetailHeader
            eventId={eventData.event.id}
            eventSlug={event}
            eventName={eventData.event.name}
            websiteUrl={eventData.event.websiteUrl}
            locale={localeTyped}
            formattedDate={formattedDate}
            locationLabel={locationLabel}
            hasConfirmedDate={eventData.dateRange.startDate !== null}
            officialWebsiteLabel={tEvent('officialWebsite')}
            shareMessage={tEvent('share.message', {
              eventName: eventData.event.name,
              url: `${BASE_URL}/${locale}/e/${event}`,
            })}
            shareLabel={tEvent('share.label')}
            saveFavoriteLabel={tEvent('favorite.save')}
            removeFavoriteLabel={tEvent('favorite.remove')}
          />

          {showResults ? (
            <EventResultsAccordion
              eventId={eventData.event.id}
              eventSlug={event}
              locale={localeTyped}
              races={eventData.races}
              title={tEvent('resultsAccordion.title', {
                eventName: eventData.event.name,
                year: resultsYear,
              })}
              viewLabel={tEvent('resultsAccordion.view')}
            />
          ) : null}

          {eventData.event.description && (
            <div className="w-full my-6 sm:my-8">
              <p className="text-base whitespace-pre-line">
                {eventData.event.description}
              </p>
            </div>
          )}

          <SponsorBannerSlot
            page="event_page"
            locale={localeTyped}
            className="my-6 sm:my-8"
          />

          <section className="mt-8 sm:mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Route className="h-5 w-5 text-gray-500" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-950">
                {tEvent('racesTitle')}
              </h2>
            </div>
            <EventDistanceList
              eventId={eventData.event.id}
              eventName={eventData.event.name}
              eventSlug={event}
              races={eventData.races}
              locale={localeTyped}
              ratioTooltip={tEvent('elevationRatioTooltip')}
            />
          </section>

          <EventTrackMapSection
            eventId={eventData.event.id}
            eventSlug={event}
            races={eventData.races}
            trackedRaceIds={eventData.trackedRaceIds}
          />

          <div className="mt-10 sm:mt-12">
            <EventFeatureFeedback
              eventId={eventData.event.id}
              eventSlug={event}
            />
          </div>

          {provinceDestination ? (
            <EventDiscoverySection
              eventId={eventData.event.id}
              eventSlug={event}
              province={eventData.location.province}
              provinceHref={getDestinationPath(
                locale,
                provinceDestination.regionId,
                provinceDestination.provinceId,
              )}
              provinceLinkLabel={tEvent('provincePageLinkText', {
                province: tProvincia(`names.${provinceDestination.provinceId}`),
              })}
              recommendedEvents={publicRecommendedEvents}
              locale={localeTyped}
            />
          ) : null}
          {!eventData.event.organizerId && (
            <div className="mt-10">
              <RaceOrganizerClaimCard
                label={tEvent('organizerCard.label')}
                claimButton={tEvent('organizerCard.claimButton')}
                raceName={eventData.event.name}
                resourceType="event"
                claimModalNamespace="event.claimModal"
                confirmationNamespace="event.claimConfirmation"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { Calendar, MapPin, Route } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { BASE_URL } from '@/lib/config';
import { getEventBySlug, getRecommendedEvents } from '@/lib/db/events';
import { buildEventAlternateLinks } from '@/lib/content/alternate-links';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { EventCard } from '@/components/event/event-card';
import { EventFavoriteButton } from '@/components/event/event-favorite-button';
import { EventDistanceList } from '@/components/event/event-distance-list';
import { EventShareWhatsappButton } from '@/components/event/event-share-whatsapp-button';
import { ConfirmedDateBadge } from '@/components/race/confirmed-date-badge';
import { RaceOrganizerClaimCard } from '@/components/race/race-organizer-claim-card';
import { TrackedLink } from '@/components/ui/tracked-link';
import { formatEventDateRange } from '@/lib/events/utils';
import { buildBreadcrumbJsonLd, buildEventJsonLd } from '@/lib/seo/json-ld';
import { LOCALE_BY_LANGUAGE, SITE_NAME } from '@/lib/seo/meta-config';
import { getDestinationPath, getProvinceByDbName } from '@/lib/geography/destinations';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

export const revalidate = false;

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

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
  const eventData = await getEventBySlug(event);

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

  const eventData = await getEventBySlug(event);

  if (!eventData) {
    notFound();
  }

  const localeTyped = locale as Locale;
  const tEvent = await getTranslations({ locale, namespace: 'event' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tProvincia = await getTranslations({ locale, namespace: 'provincia' });

  const formattedDate = formatEventDateRange(
    eventData.dateRange,
    localeTyped,
    tEvent('dateTbd'),
  );
  const locationLabel = eventData.location.isMultipleLocations
    ? tEvent('multipleLocations')
    : [eventData.location.city, eventData.location.province]
      .filter(Boolean)
      .join(', ');

  const destinationProvince =
    !eventData.location.isMultipleLocations && eventData.location.province
      ? getProvinceByDbName(eventData.location.province)
      : null;
  const provinceDestination = destinationProvince
    ? {
      regionId: destinationProvince.province.regionId,
      provinceId: destinationProvince.id,
      provinceSlug: destinationProvince.province.slug,
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

  const jsonLd = buildEventJsonLd(eventData, event, localeTyped);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    ...(provinceDestination
      ? [
        {
          name: tProvincia(`names.${provinceDestination.provinceSlug}`),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
        <div className="flex flex-col max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb
            items={[
              { name: tNav('calendar'), href: `/${locale}` },
              ...(provinceDestination
                ? [
                  {
                    name: tProvincia(`names.${provinceDestination.provinceSlug}`),
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

          <header className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="flex flex-col flex-1 gap-1.5 sm:gap-1">
              <div className="flex flex-row items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                  {eventData.event.name}
                </h1>
              </div>
              <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
                <Calendar className="h-4 w-4 shrink-0 text-black" />
                <span className="text-sm lg:text-base text-gray-600 whitespace-nowrap">
                  {formattedDate}
                </span>
                {eventData.dateRange.startDate && <ConfirmedDateBadge locale={locale} />}
              </div>
              <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1 text-sm lg:text-base text-gray-600">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{locationLabel}</span>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
              <div className="flex w-full flex-col gap-2">
                {eventData.event.websiteUrl && (
                  <TrackedLink
                    href={eventData.event.websiteUrl}
                    eventName={ANALYTICS_EVENTS.EVENT_OFFICIAL_WEBSITE_CLICKED}
                    eventProperties={{ event_id: eventData.event.id, event_slug: event }}
                    external
                    className="w-full bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none transition-colors cursor-pointer text-center whitespace-nowrap"
                  >
                    {tEvent('officialWebsite')}
                  </TrackedLink>
                )}
                <div className="flex flex-row gap-2">
                  <EventShareWhatsappButton
                    message={tEvent('share.message', {
                      eventName: eventData.event.name,
                      url: `${BASE_URL}/${locale}/e/${event}`,
                    })}
                    label={tEvent('share.label')}
                    iconOnly
                    className="flex-1"
                    eventId={eventData.event.id}
                    eventSlug={event}
                  />
                  <EventFavoriteButton
                    eventId={eventData.event.id}
                    eventSlug={event}
                    saveLabel={tEvent('favorite.save')}
                    removeLabel={tEvent('favorite.remove')}
                    iconOnly
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </header>

          {eventData.event.description && (
            <div className="w-full my-6 sm:my-8">
              <p className="text-base whitespace-pre-line">
                {eventData.event.description}
              </p>
            </div>
          )}

          <section className="mt-8 sm:mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Route className="h-5 w-5 text-gray-500" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-950">
                {tEvent('racesTitle')}
              </h2>
            </div>
            <EventDistanceList races={eventData.races} locale={localeTyped} />
          </section>

          {provinceDestination && (
            <div className="mt-12 flex flex-col gap-3">
              <TrackedLink
                href={getDestinationPath(
                  locale,
                  provinceDestination.regionId,
                  provinceDestination.provinceId,
                )}
                eventName={ANALYTICS_EVENTS.EVENT_PROVINCE_LINK_CLICKED}
                eventProperties={{
                  event_id: eventData.event.id,
                  event_slug: event,
                  province: eventData.location.province ?? '',
                }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-gray-300"
              >
                <span className="text-sm font-medium text-gray-900">
                  {tEvent('provincePageLinkText', {
                    province: eventData.location.province ?? '',
                  })}
                </span>
                <span className="font-semibold text-gray-400">↗</span>
              </TrackedLink>
              {recommendedEvents.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {recommendedEvents.map((recommendedEvent) => (
                    <EventCard
                      key={recommendedEvent.event.id}
                      eventDetail={recommendedEvent}
                      locale={localeTyped}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
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

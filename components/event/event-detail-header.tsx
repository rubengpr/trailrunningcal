import { Calendar, Globe, MapPin } from 'lucide-react';
import { EventFavoriteButton } from '@/components/event/event-favorite-button';
import { EventShareWhatsappButton } from '@/components/event/event-share-whatsapp-button';
import { ConfirmedDateBadge } from '@/components/race/confirmed-date-badge';
import { TrackedLink } from '@/components/ui/tracked-link';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { Locale } from '@/i18n';

interface EventDetailHeaderProps {
  eventId: string;
  eventSlug: string;
  eventName: string;
  websiteUrl: string | null;
  locale: Locale;
  formattedDate: string;
  locationLabel: string;
  hasConfirmedDate: boolean;
  officialWebsiteLabel: string;
  shareMessage: string;
  shareLabel: string;
  saveFavoriteLabel: string;
  removeFavoriteLabel: string;
}

export function EventDetailHeader({
  eventId,
  eventSlug,
  eventName,
  websiteUrl,
  locale,
  formattedDate,
  locationLabel,
  hasConfirmedDate,
  officialWebsiteLabel,
  shareMessage,
  shareLabel,
  saveFavoriteLabel,
  removeFavoriteLabel,
}: EventDetailHeaderProps): React.ReactElement {
  return (
    <header className="mt-3 flex flex-col gap-4 sm:mt-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex flex-1 flex-col gap-1.5 sm:gap-1">
        <div className="flex flex-row items-center gap-2">
          <h1 className="text-xl font-semibold sm:text-2xl lg:text-3xl">
            {eventName}
          </h1>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
          <Calendar className="h-4 w-4 shrink-0 text-black" />
          <span className="whitespace-nowrap text-sm text-gray-600 lg:text-base">
            {formattedDate}
          </span>
          {hasConfirmedDate ? <ConfirmedDateBadge locale={locale} /> : null}
        </div>
        <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-600 lg:text-base">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{locationLabel}</span>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
        <div className="flex w-full flex-col gap-2">
          {websiteUrl ? (
            <TrackedLink
              href={websiteUrl}
              eventName={ANALYTICS_EVENTS.EVENT_OFFICIAL_WEBSITE_CLICKED}
              eventProperties={{ event_id: eventId, event_slug: eventSlug }}
              external
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-center font-medium whitespace-nowrap text-white transition-colors hover:bg-gray-600 focus:outline-none"
            >
              <Globe className="h-4 w-4" />
              {officialWebsiteLabel}
            </TrackedLink>
          ) : null}
          <div className="flex flex-row gap-2">
            <EventShareWhatsappButton
              message={shareMessage}
              label={shareLabel}
              iconOnly
              className="flex-1"
              eventId={eventId}
              eventSlug={eventSlug}
            />
            <EventFavoriteButton
              eventId={eventId}
              eventSlug={eventSlug}
              saveLabel={saveFavoriteLabel}
              removeLabel={removeFavoriteLabel}
              iconOnly
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

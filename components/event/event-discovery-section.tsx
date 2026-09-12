import { EventCard } from '@/components/event/event-card';
import { TrackedLink } from '@/components/ui/tracked-link';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { Locale } from '@/i18n';
import type { PublicEventDetail } from '@/types/event.types';

interface EventDiscoverySectionProps {
  eventId: string;
  eventSlug: string;
  province: string | null;
  provinceHref: string;
  provinceLinkLabel: string;
  recommendedEvents: PublicEventDetail[];
  locale: Locale;
}

export function EventDiscoverySection({
  eventId,
  eventSlug,
  province,
  provinceHref,
  provinceLinkLabel,
  recommendedEvents,
  locale,
}: EventDiscoverySectionProps): React.ReactElement {
  return (
    <div className="mt-12 flex flex-col gap-3">
      <TrackedLink
        href={provinceHref}
        eventName={ANALYTICS_EVENTS.EVENT_PROVINCE_LINK_CLICKED}
        eventProperties={{
          event_id: eventId,
          event_slug: eventSlug,
          province: province ?? '',
        }}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-gray-300"
      >
        <span className="text-sm font-medium text-gray-900">{provinceLinkLabel}</span>
        <span className="font-semibold text-gray-400">↗</span>
      </TrackedLink>
      {recommendedEvents.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {recommendedEvents.map((recommendedEvent) => (
            <EventCard
              key={recommendedEvent.event.id}
              eventDetail={recommendedEvent}
              locale={locale}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

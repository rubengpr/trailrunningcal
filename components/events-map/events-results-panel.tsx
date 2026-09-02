'use client';

import { useTranslations } from 'next-intl';
import { RefreshCw, Search } from 'lucide-react';
import { EventCard } from '@/components/event/event-card';
import { SponsorBannerSlot } from '@/components/sponsors/sponsor-banner-slot';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RaceCardError, SearchError } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { isFeaturedEvent } from '@/lib/featured-events/config';
import type { Locale } from '@/i18n';
import type { PageType } from '@/lib/analytics/card-impression-batcher';
import type { PublicEventDetail } from '@/types/event.types';
import type { LayoutToggleVariant } from '@/components/ui/layout-toggle';

interface EventsResultsPanelProps {
  events: PublicEventDetail[];
  locale: Locale;
  pageType: PageType;
  className: string;
  isDesktopMap: boolean;
  layoutToggleVariant: LayoutToggleVariant | null;
  showsFeaturedCards: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  requestError: 'refresh' | 'load-more' | null;
  hasMore: boolean;
  total: number;
  onRetry: () => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
}

export function EventsResultsPanel({
  events,
  locale,
  pageType,
  className,
  isDesktopMap,
  layoutToggleVariant,
  showsFeaturedCards,
  isRefreshing,
  isLoadingMore,
  requestError,
  hasMore,
  total,
  onRetry,
  onClearFilters,
  onLoadMore,
}: EventsResultsPanelProps): React.ReactElement {
  const tResults = useTranslations('results');
  const tFilters = useTranslations('filters');

  return (
    <div className={className}>
      <SponsorBannerSlot page="homepage" locale={locale} className="mb-4 bg-white py-2" />
      <div className="grid min-h-[200px] min-w-0 grid-cols-1 gap-4">
        {isRefreshing ? (
          <p className="py-3 text-center text-sm text-gray-500">{tResults('loading')}</p>
        ) : null}
        {requestError === 'refresh' ? (
          <SearchError onRetry={onRetry} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Search className="mx-auto size-16 text-gray-400" strokeWidth={1.5} />}
            title={tResults('noRacesFound')}
            description={tResults('noRacesMessage')}
            action={
              <Button onClick={onClearFilters}>
                <RefreshCw className="mr-2 size-4" strokeWidth={2} />
                {tFilters('clearFilters')}
              </Button>
            }
          />
        ) : (
          events.map((eventDetail, index) => (
            <div key={eventDetail.event.id} className="min-w-0">
              <ErrorBoundary fallback={<RaceCardError />}>
                <EventCard
                  eventDetail={eventDetail}
                  locale={locale}
                  isFeatured={showsFeaturedCards && isFeaturedEvent(eventDetail.event.slug)}
                  analyticsContext={{
                    source: 'calendar_explorer',
                    pageType,
                    listPosition: index + 1,
                    ...(isDesktopMap && layoutToggleVariant ? { layoutToggleVariant } : {}),
                  }}
                />
              </ErrorBoundary>
            </div>
          ))
        )}
      </div>
      {requestError === 'load-more' ? (
        <div className="mt-4">
          <SearchError onRetry={onLoadMore} />
        </div>
      ) : null}
      {events.length > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          {hasMore && requestError !== 'load-more' ? (
            <Button onClick={onLoadMore} disabled={isLoadingMore || isRefreshing}>
              {isLoadingMore ? tResults('loadingMore') : tResults('loadMore')}
            </Button>
          ) : null}
          <p className="text-xs text-gray-500">
            {tResults('showingCount', { count: events.length, total })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

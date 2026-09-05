'use client';

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SearchError } from '@/components/ui/error-message';
import { EventsMapPanel } from '@/components/events-map/events-map-panel';
import { EventsResultsPanel } from '@/components/events-map/events-results-panel';
import { MapToggleFab } from '@/components/events-map/map-toggle-fab';
import { MobileFiltersModal } from '@/components/filters/mobile-filters-modal';
import type { Locale } from '@/i18n';
import type { PageType } from '@/lib/analytics/card-impression-batcher';
import type { RegionId } from '@/lib/geography/destinations';
import type { EventMapLocationsStatus } from '@/hooks/use-event-map-locations';
import type { DesktopLayout, LayoutToggleVariant } from '@/components/ui/layout-toggle';
import type { PublicEventDetail } from '@/types/event.types';
import type { EventMapMarker, MapPageLabels } from '@/types/map.types';

type MobileView = 'list' | 'map';

interface EventsExplorerLayoutProps {
  events: PublicEventDetail[];
  markers: EventMapMarker[];
  locale: Locale;
  labels: MapPageLabels;
  pageType: PageType;
  desktopLayout: DesktopLayout;
  mobileView: MobileView;
  showListPanel: boolean;
  showMapPanel: boolean;
  showMobileMapFab: boolean;
  mapStatus: EventMapLocationsStatus;
  mapClassName: string;
  layoutToggleVariant: LayoutToggleVariant | null;
  showsFeaturedCards: boolean;
  isDesktopMap: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  requestError: 'refresh' | 'load-more' | null;
  hasMore: boolean;
  total: number;
  mapToggleFabClassName: string;
  isFiltersModalOpen: boolean;
  isControlVariant: boolean;
  selectedMonth: string[];
  selectedProvince: string[];
  selectedDistance: string[];
  selectedRaceType: string[];
  showProvinceFilter: boolean;
  showDistanceFilter: boolean;
  regionId?: RegionId;
  onRetry: () => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  onActivateMap: () => void;
  onRetryMap: () => void;
  onCloseFiltersModal: () => void;
  onApplyFilters: (month: string[], province: string[], distance: string[], raceType: string[]) => void;
  onViewMap: () => void;
  onViewList: () => void;
  mapToggleLabel: string;
}

export function EventsExplorerLayout({
  events,
  markers,
  locale,
  labels,
  pageType,
  desktopLayout,
  mobileView,
  showListPanel,
  showMapPanel,
  showMobileMapFab,
  mapStatus,
  mapClassName,
  layoutToggleVariant,
  showsFeaturedCards,
  isDesktopMap,
  isRefreshing,
  isLoadingMore,
  requestError,
  hasMore,
  total,
  mapToggleFabClassName,
  isFiltersModalOpen,
  isControlVariant,
  selectedMonth,
  selectedProvince,
  selectedDistance,
  selectedRaceType,
  showProvinceFilter,
  showDistanceFilter,
  regionId,
  onRetry,
  onClearFilters,
  onLoadMore,
  onActivateMap,
  onRetryMap,
  onCloseFiltersModal,
  onApplyFilters,
  onViewMap,
  onViewList,
  mapToggleLabel,
}: EventsExplorerLayoutProps): React.ReactElement {
  const resultsPanelClassName = `min-h-0 min-w-0 w-full ${desktopLayout === 'both' ? 'lg:-mx-3 lg:w-[calc(50%+1.5rem)] lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:px-3' : 'lg:w-full'} ${showMobileMapFab && mobileView === 'list' ? 'pb-20' : ''}`;
  const mapPanelClassName = `min-h-0 min-w-0 w-full shrink-0 lg:self-start ${desktopLayout === 'both' ? 'lg:w-1/2' : 'lg:w-full'}`;

  return (
    <>
      <main className="min-w-0">
        <ErrorBoundary fallback={<SearchError onRetry={onRetry} />}>
          <section id="carreras">
            <div className="mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
              <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                {showListPanel ? (
                  <EventsResultsPanel
                    events={events}
                    locale={locale}
                    pageType={pageType}
                    className={resultsPanelClassName}
                    isDesktopMap={isDesktopMap}
                    layoutToggleVariant={layoutToggleVariant}
                    showsFeaturedCards={showsFeaturedCards}
                    isRefreshing={isRefreshing}
                    isLoadingMore={isLoadingMore}
                    requestError={requestError}
                    hasMore={hasMore}
                    total={total}
                    onRetry={onRetry}
                    onClearFilters={onClearFilters}
                    onLoadMore={onLoadMore}
                  />
                ) : null}

                {showMapPanel ? (
                  <EventsMapPanel
                    markers={markers}
                    locale={locale}
                    labels={labels}
                    status={mapStatus}
                    className={mapPanelClassName}
                    mapClassName={mapClassName}
                    onActivate={onActivateMap}
                    onRetry={onRetryMap}
                  />
                ) : null}
              </div>
            </div>
          </section>
        </ErrorBoundary>
      </main>

      {!isControlVariant ? (
        <MobileFiltersModal
          isOpen={isFiltersModalOpen}
          onClose={onCloseFiltersModal}
          onApply={onApplyFilters}
          onClear={onClearFilters}
          initialMonth={selectedMonth}
          initialProvince={selectedProvince}
          initialDistance={selectedDistance}
          initialRaceType={selectedRaceType}
          showProvinceFilter={showProvinceFilter}
          showDistanceFilter={showDistanceFilter}
          regionId={regionId}
        />
      ) : null}

      {showMobileMapFab ? (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 lg:hidden">
          <MapToggleFab
            view={mobileView === 'list' ? 'map' : 'list'}
            label={mapToggleLabel}
            className={mapToggleFabClassName}
            onClick={mobileView === 'list' ? onViewMap : onViewList}
          />
        </div>
      ) : null}
    </>
  );
}

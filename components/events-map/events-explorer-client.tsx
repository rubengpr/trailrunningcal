'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import type { MapPageLabels } from '@/types/map.types';
import type {
  PublicEventFilters,
  PublicEventPage,
  PublicEventScope,
} from '@/types/public-events.types';
import { EventsExplorerFiltersSection } from '@/components/events-map/events-explorer-filters-section';
import { MobileFiltersButton } from '@/components/filters/mobile-filters-button';
import { MobileFiltersModal } from '@/components/filters/mobile-filters-modal';
import { SponsorBannerSlot } from '@/components/sponsors/sponsor-banner-slot';
import { EventCard } from '@/components/event/event-card';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SearchError } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import type {
  DesktopLayout,
  LayoutToggleButton,
  LayoutToggleVariant,
} from '@/components/ui/layout-toggle';
import { DeferredEventsMap } from '@/components/events-map/deferred-events-map';
import { MapToggleFab } from '@/components/events-map/map-toggle-fab';
import { Search, RefreshCw, TriangleAlert } from 'lucide-react';
import { useMinWidthLg } from '@/hooks/use-min-width-lg';
import { useEventMapLocations } from '@/hooks/use-event-map-locations';
import { useScrollEdges } from '@/hooks/use-scroll-edges';
import { useMobileFilters } from '@/components/providers/mobile-filters-provider';
import { getPublicEventPage } from '@/lib/api/events';
import { isRaceCategorySlug } from '@/lib/races/race-types';
import { isFeaturedEvent } from '@/lib/featured-events/config';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

type MobileView = 'list' | 'map';
type FiltersAppliedVariant =
  | 'control'
  | 'control-black'
  | 'sticky-button-white'
  | 'sticky-button-black'
  | 'pill-white'
  | 'pill-black';
type FilterType = 'month' | 'province' | 'distance' | 'race_type' | 'apply';

interface EventsExplorerClientProps {
  initialPage: PublicEventPage;
  scope?: PublicEventScope;
  locale: Locale;
  labels: MapPageLabels;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
}

export function EventsExplorerClient({
  initialPage,
  scope,
  locale,
  labels,
  showProvinceFilter = true,
  showDistanceFilter = true,
}: EventsExplorerClientProps) {
  const tResults = useTranslations('results');
  const tFilters = useTranslations('filters');
  const tErrors = useTranslations('errors');
  const tMap = useTranslations('map');
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [desktopLayout, setDesktopLayout] = useState<DesktopLayout>('both');
  const [events, setEvents] = useState(initialPage.events);
  const [page, setPage] = useState(initialPage.page);
  const [total, setTotal] = useState(initialPage.total);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [requestError, setRequestError] = useState<'refresh' | 'load-more' | null>(null);
  const [layoutToggleVariant, setLayoutToggleVariant] = useState<LayoutToggleVariant | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const pillsScrollRef = useRef<HTMLDivElement>(null);
  const skippedInitialEmptyFiltersRef = useRef(false);
  const loadMoreControllerRef = useRef<AbortController | null>(null);
  const {
    activate: activateMap,
    markers,
    retry: retryMap,
    status: mapStatus,
  } = useEventMapLocations(events);

  const pageType: 'homepage' | 'finder_type' | 'finder_province_distance' = scope?.raceType
    ? 'finder_type'
    : scope?.province
      ? 'finder_province_distance'
      : 'homepage';

  const isDesktopMap = useMinWidthLg();
  const v2Variant = useFeatureFlagVariant('filter-flag-v2');
  const v2VariantStr = typeof v2Variant === 'string' ? v2Variant : null;
  const filterLayout = v2VariantStr?.includes('-') ? v2VariantStr.slice(0, v2VariantStr.lastIndexOf('-')) : (v2VariantStr ?? 'control');
  const filterColor: 'white' | 'black' = v2VariantStr?.endsWith('-black') ? 'black' : 'white';
  const isControlVariant = filterLayout === 'control';
  const isInlineTextVariant = filterLayout === 'sticky-button';
  const isPillVariant = filterLayout === 'pill';
  const analyticsFilterVariant: FiltersAppliedVariant =
    (v2VariantStr ?? 'control') as FiltersAppliedVariant;

  const trackFiltersApplied = useCallback((filterType: FilterType) => {
    track(ANALYTICS_EVENTS.FILTERS_APPLIED, {
      variant: analyticsFilterVariant,
      filter_type: filterType,
    });
  }, [analyticsFilterVariant]);

  const [selectedMonth, setSelectedMonth] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<string[]>([]);
  const [selectedRaceType, setSelectedRaceType] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isActive = true;

    const readStoredFilter = (key: string): string[] => {
      try {
        const stored = sessionStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    queueMicrotask(() => {
      if (!isActive) return;

      setSelectedMonth(readStoredFilter('filter_month'));
      setSelectedProvince(
        showProvinceFilter ? readStoredFilter('filter_province') : [],
      );
      setSelectedDistance(readStoredFilter('filter_distance'));
      setSelectedRaceType(readStoredFilter('filter_type'));
      setFiltersHydrated(true);
    });

    return () => {
      isActive = false;
    };
  }, [showProvinceFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('filter_month', JSON.stringify(selectedMonth));
    if (showProvinceFilter) {
      sessionStorage.setItem('filter_province', JSON.stringify(selectedProvince));
    }
    sessionStorage.setItem('filter_distance', JSON.stringify(selectedDistance));
    sessionStorage.setItem('filter_type', JSON.stringify(selectedRaceType));
  }, [
    selectedMonth,
    selectedProvince,
    selectedDistance,
    selectedRaceType,
    showProvinceFilter,
  ]);

  const filters = useMemo<PublicEventFilters>(() => ({
    months: selectedMonth.map(Number),
    provinces: showProvinceFilter ? selectedProvince : [],
    distanceRanges: selectedDistance,
    raceTypes: selectedRaceType.filter(isRaceCategorySlug),
  }), [
    selectedMonth,
    selectedProvince,
    selectedDistance,
    selectedRaceType,
    showProvinceFilter,
  ]);
  useEffect(() => {
    if (!filtersHydrated) return;

    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    setIsLoadingMore(false);

    const hasFilters =
      filters.months.length > 0 ||
      filters.provinces.length > 0 ||
      filters.distanceRanges.length > 0 ||
      filters.raceTypes.length > 0;

    if (!skippedInitialEmptyFiltersRef.current && !hasFilters) {
      skippedInitialEmptyFiltersRef.current = true;
      return;
    }
    skippedInitialEmptyFiltersRef.current = true;

    const controller = new AbortController();
    setIsRefreshing(true);
    setRequestError(null);

    void getPublicEventPage({
      page: 1,
      referenceDate: initialPage.referenceDate,
      filters,
      scope,
    }, controller.signal)
      .then((nextPage) => {
        setEvents(nextPage.events);
        setPage(nextPage.page);
        setTotal(nextPage.total);
        setHasMore(nextPage.hasMore);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setEvents([]);
        setPage(1);
        setTotal(0);
        setHasMore(false);
        setRequestError('refresh');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRefreshing(false);
      });

    return () => controller.abort();
  }, [
    filtersHydrated,
    filters,
    initialPage.referenceDate,
    retryToken,
    scope,
  ]);

  useEffect(() => () => {
    loadMoreControllerRef.current?.abort();
  }, []);

  const activeFiltersCount =
    selectedMonth.length +
    selectedProvince.length +
    selectedDistance.length +
    selectedRaceType.length;

  const { canScrollLeft, canScrollRight } = useScrollEdges(pillsScrollRef, isPillVariant);
  const { isOpen: isFiltersModalOpen, open: openFiltersModal, close: closeFiltersModal, register, unregister, updateFilterCount, updateFilterVariant, filterCount } = useMobileFilters();

  useEffect(() => {
    updateFilterVariant(filterLayout);
  }, [filterLayout, updateFilterVariant]);

  useEffect(() => {
    if (isControlVariant || isPillVariant) return;
    register();
    return () => unregister();
  }, [isControlVariant, isPillVariant, register, unregister]);

  useEffect(() => {
    updateFilterCount(activeFiltersCount);
  }, [activeFiltersCount, updateFilterCount]);

  const handleRetry = () => {
    setRetryToken((current) => current + 1);
  };

  const handleLoadMore = async (): Promise<void> => {
    if (!hasMore || isLoadingMore || isRefreshing) return;

    setIsLoadingMore(true);
    setRequestError(null);
    const nextPageNumber = page + 1;
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = controller;

    try {
      const nextPage = await getPublicEventPage({
        page: nextPageNumber,
        referenceDate: initialPage.referenceDate,
        filters,
        scope,
      }, controller.signal);

      if (controller.signal.aborted) return;

      setEvents((current) => {
        const eventsById = new Map(
          current.map((event) => [event.event.id, event]),
        );
        for (const event of nextPage.events) {
          eventsById.set(event.event.id, event);
        }
        return [...eventsById.values()];
      });
      setPage(nextPage.page);
      setTotal(nextPage.total);
      setHasMore(nextPage.hasMore);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setRequestError('load-more');
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        setIsLoadingMore(false);
      }
    }
  };

  const handleMonthSelect = useCallback((month: string[]) => {
    setSelectedMonth(month);
    trackFiltersApplied('month');
  }, [trackFiltersApplied]);

  const handleProvinceSelect = useCallback((province: string[]) => {
    setSelectedProvince(province);
    trackFiltersApplied('province');
  }, [trackFiltersApplied]);

  const handleDistanceSelect = useCallback((distance: string[]) => {
    setSelectedDistance(distance);
    trackFiltersApplied('distance');
  }, [trackFiltersApplied]);

  const handleRaceTypeSelect = useCallback((raceType: string[]) => {
    setSelectedRaceType(raceType);
    trackFiltersApplied('race_type');
  }, [trackFiltersApplied]);

  const handleClearFilters = useCallback(() => {
    setSelectedMonth([]);
    setSelectedProvince([]);
    setSelectedDistance([]);
    setSelectedRaceType([]);
    track(ANALYTICS_EVENTS.RACE_FILTERS_CLEARED);
  }, []);

  const handleFiltersApplyAndClose = (month: string[], province: string[], distance: string[], raceType: string[]) => {
    setSelectedMonth(month);
    setSelectedProvince(province);
    setSelectedDistance(distance);
    setSelectedRaceType(raceType);
    trackFiltersApplied('apply');
    closeFiltersModal();
  };

  const handleDesktopLayoutChange = (
    layout: DesktopLayout,
    button: LayoutToggleButton,
    layoutToggleVariant: LayoutToggleVariant,
  ): void => {
    setDesktopLayout(layout);
    setTimeout(() => track(ANALYTICS_EVENTS.DESKTOP_LAYOUT_CHANGED, {
      layout,
      button,
      layout_toggle_variant: layoutToggleVariant,
    }), 0);
  };

  const handleViewMapClick = (): void => {
    activateMap();
    setMobileView('map');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => track(ANALYTICS_EVENTS.CALENDAR_VIEW_MAP_CLICKED, { locale }), 0);
  };

  const handleViewListClick = (): void => {
    setMobileView('list');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => track(ANALYTICS_EVENTS.MAP_VIEW_LIST_CLICKED, { locale }), 0);
  };

  /** Split column — sticky map; height on map root. */
  const mapPanelClassNameDesktop =
    'h-[min(78vh,640px)] min-h-[280px] lg:min-h-[360px]';

  /** Full-width map below filters on small screens. */
  const mapPanelClassNameMobile =
    'h-[min(85dvh,720px)] min-h-[280px]';

  const showListPanel = isDesktopMap ? desktopLayout !== 'map' : mobileView === 'list';
  const showMapPanel = isDesktopMap ? desktopLayout !== 'list' : mobileView === 'map';

  const showMobileMapFab = !isDesktopMap && events.length > 0;

  /** Capsule / pill: override Button `rounded-md`; generous horizontal padding. */
  const mapToggleFabClassName =
    '!rounded-full px-5 py-1 min-h-12 whitespace-nowrap shadow-lg';

  return (
    <>
      <EventsExplorerFiltersSection
        filterLayout={filterLayout}
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        selectedMonth={selectedMonth}
        selectedProvince={selectedProvince}
        selectedDistance={selectedDistance}
        selectedRaceType={selectedRaceType}
        onMonthSelect={handleMonthSelect}
        onProvinceSelect={handleProvinceSelect}
        onDistanceSelect={handleDistanceSelect}
        onRaceTypeSelect={handleRaceTypeSelect}
        onClearFilters={handleClearFilters}
        showProvinceFilter={showProvinceFilter}
        showDistanceFilter={showDistanceFilter}
        filterColor={filterColor}
        isDesktop={isDesktopMap}
        desktopLayout={desktopLayout}
        onDesktopLayoutChange={handleDesktopLayoutChange}
        onLayoutToggleVariantResolved={setLayoutToggleVariant}
        pillsScrollRef={pillsScrollRef}
      />

      {isInlineTextVariant && (
        <MobileFiltersButton
          filterCount={filterCount}
          color={filterColor}
          onClick={() => {
            openFiltersModal();
            setTimeout(() => track(ANALYTICS_EVENTS.NAVBAR_FILTER_ICON_CLICKED, { filter_count: filterCount, variant: filterLayout }), 0);
          }}
        />
      )}

      <main className="min-w-0">
        <ErrorBoundary fallback={<SearchError onRetry={handleRetry} />}>
          <section id="carreras">
            <div className="mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
              <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                {showListPanel && (
                  <div
                    className={`min-w-0 w-full min-h-0 ${desktopLayout === 'both' ? 'lg:-mx-3 lg:w-[calc(50%+1.5rem)] lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:px-3' : 'lg:w-full'} ${showMobileMapFab && mobileView === 'list' ? 'pb-20' : ''}`}
                  >
                    <SponsorBannerSlot
                      page="homepage"
                      locale={locale}
                      bannerType="image_banner"
                      className="sticky top-18 z-20 mb-4 bg-white py-2 sm:top-20 lg:top-0"
                    />
                    <div className="grid min-h-[200px] min-w-0 grid-cols-1 gap-4">
                      {isRefreshing ? (
                        <p className="py-3 text-center text-sm text-gray-500">
                          {tResults('loading')}
                        </p>
                      ) : null}
                      {requestError === 'refresh' ? (
                        <SearchError onRetry={handleRetry} />
                      ) : events.length === 0 ? (
                        <EmptyState
                          icon={
                            <Search className="mx-auto size-16 text-gray-400" strokeWidth={1.5} />
                          }
                          title={tResults('noRacesFound')}
                          description={tResults('noRacesMessage')}
                          action={
                            <Button onClick={handleClearFilters}>
                              <RefreshCw className="size-4 mr-2" strokeWidth={2} />
                              {tFilters('clearFilters')}
                            </Button>
                          }
                        />
                      ) : (
                        events.map((eventDetail, index) => {
                          return (
                            <div key={eventDetail.event.id} className="min-w-0">
                              <ErrorBoundary
                                fallback={
                                  <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                                    <div className="text-center">
                                      <div className="mb-2">
                                        <TriangleAlert className="mx-auto size-8 text-red-500" strokeWidth={2} />
                                      </div>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                        {tErrors('raceLoadError')}
                                      </h4>
                                      <p className="text-xs text-gray-600">
                                        {tErrors('raceLoadErrorMessage')}
                                      </p>
                                    </div>
                                  </div>
                                }
                              >
                                <EventCard
                                  eventDetail={eventDetail}
                                  locale={locale}
                                  isFeatured={isFeaturedEvent(eventDetail.event.slug)}
                                  analyticsContext={{
                                    source: 'calendar_explorer',
                                    pageType,
                                    listPosition: index + 1,
                                    ...(isDesktopMap && layoutToggleVariant
                                      ? { layoutToggleVariant }
                                      : {}),
                                  }}
                                />
                              </ErrorBoundary>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {requestError === 'load-more' ? (
                      <div className="mt-4">
                        <SearchError onRetry={() => void handleLoadMore()} />
                      </div>
                    ) : null}
                    {events.length > 0 ? (
                      <div className="mt-6 flex flex-col items-center gap-2">
                        {hasMore && requestError !== 'load-more' ? (
                          <Button
                            onClick={() => void handleLoadMore()}
                            disabled={isLoadingMore || isRefreshing}
                          >
                            {isLoadingMore
                              ? tResults('loadingMore')
                              : tResults('loadMore')}
                          </Button>
                        ) : null}
                        <p className="text-xs text-gray-500">
                          {tResults('showingCount', {
                            count: events.length,
                            total,
                          })}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {showMapPanel && (
                  <div className={`min-w-0 w-full min-h-0 shrink-0 ${desktopLayout === 'both' ? 'lg:w-1/2' : 'lg:w-full'} lg:self-start`}>
                    {mapStatus === 'error' && markers.length === 0 ? (
                      <SearchError onRetry={retryMap} />
                    ) : mapStatus === 'ready' && markers.length === 0 ? (
                      <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                        {tMap('empty')}
                      </p>
                    ) : (
                      <div className="relative w-full lg:sticky lg:top-6">
                        {mapStatus === 'error' ? (
                          <div className="mb-3">
                            <SearchError onRetry={retryMap} />
                          </div>
                        ) : null}
                        <DeferredEventsMap
                          markers={markers}
                          locale={locale}
                          labels={labels}
                          isReady={markers.length > 0}
                          onVisible={activateMap}
                          className={
                            isDesktopMap
                              ? mapPanelClassNameDesktop
                              : mapPanelClassNameMobile
                          }
                        />
                        {mapStatus === 'loading' && markers.length === 0 ? (
                          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-600">
                            {tMap('loading')}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </ErrorBoundary>
      </main>

      {!isControlVariant && (
        <MobileFiltersModal
          isOpen={isFiltersModalOpen}
          onClose={closeFiltersModal}
          onApply={handleFiltersApplyAndClose}
          onClear={handleClearFilters}
          initialMonth={selectedMonth}
          initialProvince={selectedProvince}
          initialDistance={selectedDistance}
          initialRaceType={selectedRaceType}
          showProvinceFilter={showProvinceFilter}
          showDistanceFilter={showDistanceFilter}
        />
      )}

      {showMobileMapFab && (
        <div className="lg:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2">
          <MapToggleFab
            view={mobileView === 'list' ? 'map' : 'list'}
            label={mobileView === 'list' ? tMap('viewMap') : tMap('viewList')}
            className={mapToggleFabClassName}
            onClick={mobileView === 'list' ? handleViewMapClick : handleViewListClick}
          />
        </div>
      )}
    </>
  );
}

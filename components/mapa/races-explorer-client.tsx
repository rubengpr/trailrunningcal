'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFeatureFlagVariantKey } from 'posthog-js/react';
import type { TrailRace } from '@/types/race.types';
import type { Locale } from '@/i18n';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';
import FilterBar, { FilterBadgeBar } from '@/components/filters/filter-bar';
import MobileFiltersButton from '@/components/filters/mobile-filters-button';
import MobileFiltersModal from '@/components/filters/mobile-filters-modal';
import TrailRaceCard from '@/components/race/trail-race-card';
import ErrorBoundary from '@/components/ui/error-boundary';
import { SearchError } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { LayoutToggle } from '@/components/ui/layout-toggle';
import type { DesktopLayout, LayoutToggleButton } from '@/components/ui/layout-toggle';
import RacesMap from '@/components/races-map/races-map';
import { MapToggleFab } from '@/components/mapa/map-toggle-fab';
import { useMinWidthLg } from '@/hooks/use-min-width-lg';
import { useScrollEdges } from '@/hooks/use-scroll-edges';
import { useMobileFilters } from '@/components/providers/mobile-filters-provider';
import { filterHomeRaces, filterMapMarkersByRaceIds } from '@/lib/home-race-filters';
import { generateRaceSlug } from '@/lib/race-utils';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

const FILTER_STORAGE_KEYS = {
  month: 'filter_month',
  province: 'filter_province',
  distance: 'filter_distance',
  type: 'filter_type',
} as const;

const readFilterStorage = (key: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

type MobileView = 'list' | 'map';

interface RacesExplorerClientProps {
  races: TrailRace[];
  markers: RaceMapMarker[];
  locale: Locale;
  labels: MapPageLabels;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
}

export default function RacesExplorerClient({
  races,
  markers,
  locale,
  labels,
  showProvinceFilter = true,
  showDistanceFilter = true,
}: RacesExplorerClientProps) {
  const tResults = useTranslations('results');
  const tFilters = useTranslations('filters');
  const tErrors = useTranslations('errors');
  const tMap = useTranslations('map');
  const [selectedMonth, setSelectedMonth] = useState<string[]>(() => readFilterStorage(FILTER_STORAGE_KEYS.month));
  const [selectedProvince, setSelectedProvince] = useState<string[]>(() => readFilterStorage(FILTER_STORAGE_KEYS.province));
  const [selectedDistance, setSelectedDistance] = useState<string[]>(() => readFilterStorage(FILTER_STORAGE_KEYS.distance));
  const [selectedRaceType, setSelectedRaceType] = useState<string[]>(() => readFilterStorage(FILTER_STORAGE_KEYS.type));
  const [focusRaceId, setFocusRaceId] = useState<string | null>(null);
  const [focusRaceNonce, setFocusRaceNonce] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [desktopLayout, setDesktopLayout] = useState<DesktopLayout>('both');
  const pillsScrollRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const isDesktopMap = useMinWidthLg();
  const v2Variant = useFeatureFlagVariantKey('filter-flag-v2');
  const v2VariantStr = typeof v2Variant === 'string' ? v2Variant : null;
  const filterLayout = v2VariantStr?.includes('-') ? v2VariantStr.slice(0, v2VariantStr.lastIndexOf('-')) : (v2VariantStr ?? 'control');
  const filterColor: 'white' | 'black' = v2VariantStr?.endsWith('-black') ? 'black' : 'white';
  const isControlVariant = filterLayout === 'control';
  const isInlineTextVariant = filterLayout === 'sticky-button';
  const isPillVariant = filterLayout === 'pill';

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
    updateFilterCount(
      selectedMonth.length +
      selectedProvince.length +
      selectedDistance.length +
      selectedRaceType.length,
    );
  }, [selectedMonth, selectedProvince, selectedDistance, selectedRaceType, updateFilterCount]);

  useEffect(() => {
    sessionStorage.setItem(FILTER_STORAGE_KEYS.month, JSON.stringify(selectedMonth));
    sessionStorage.setItem(FILTER_STORAGE_KEYS.province, JSON.stringify(selectedProvince));
    sessionStorage.setItem(FILTER_STORAGE_KEYS.distance, JSON.stringify(selectedDistance));
    sessionStorage.setItem(FILTER_STORAGE_KEYS.type, JSON.stringify(selectedRaceType));
  }, [selectedMonth, selectedProvince, selectedDistance, selectedRaceType]);

  const filteredRaces = useMemo(
    () => filterHomeRaces(races, selectedMonth, selectedProvince, selectedDistance, selectedRaceType),
    [races, selectedMonth, selectedProvince, selectedDistance, selectedRaceType],
  );

  const filteredMarkers = useMemo(() => {
    const ids = new Set(filteredRaces.map((r) => r.id));
    return filterMapMarkersByRaceIds(markers, ids);
  }, [markers, filteredRaces]);

  const handleMonthSelect = (month: string[]) => {
    setSelectedMonth(month);
    setTimeout(() => {
      track(ANALYTICS_EVENTS.RACE_MONTH_FILTER_APPLIED, { month });
      if (isControlVariant) track(ANALYTICS_EVENTS.FILTERS_APPLIED, { variant: 'control' });
    }, 0);
  };

  const handleProvinceSelect = (province: string[]) => {
    setSelectedProvince(province);
    setTimeout(() => {
      track(ANALYTICS_EVENTS.RACE_PROVINCE_FILTER_APPLIED, { province });
      if (isControlVariant) track(ANALYTICS_EVENTS.FILTERS_APPLIED, { variant: 'control' });
    }, 0);
  };

  const handleDistanceSelect = (distance: string[]) => {
    setSelectedDistance(distance);
    setTimeout(() => {
      track(ANALYTICS_EVENTS.RACE_DISTANCE_FILTER_APPLIED, { distance });
      if (isControlVariant) track(ANALYTICS_EVENTS.FILTERS_APPLIED, { variant: 'control' });
    }, 0);
  };

  const handleRaceTypeSelect = (raceType: string[]) => {
    setSelectedRaceType(raceType);
    setTimeout(() => {
      track(ANALYTICS_EVENTS.RACE_TYPE_FILTER_APPLIED, { raceType });
      if (isControlVariant) track(ANALYTICS_EVENTS.FILTERS_APPLIED, { variant: 'control' });
    }, 0);
  };

  const handleRetry = () => {
    setSelectedMonth([]);
    setSelectedProvince([]);
    window.location.reload();
  };

  const handleClearFilters = () => {
    setSelectedMonth([]);
    setSelectedProvince([]);
    setSelectedDistance([]);
    setSelectedRaceType([]);
    setTimeout(() => track(ANALYTICS_EVENTS.RACE_FILTERS_CLEARED), 0);
  };

  const handleFiltersApply = (month: string[], province: string[], distance: string[], raceType: string[]) => {
    setSelectedMonth(month);
    setSelectedProvince(province);
    setSelectedDistance(distance);
    setSelectedRaceType(raceType);
    setTimeout(() => track(ANALYTICS_EVENTS.FILTERS_APPLIED, { variant: filterLayout, month, province, distance, raceType }), 0);
    closeFiltersModal();
  };

  const handleDesktopLayoutChange = (layout: DesktopLayout, button: LayoutToggleButton): void => {
    setDesktopLayout(layout);
    setTimeout(() => track(ANALYTICS_EVENTS.DESKTOP_LAYOUT_CHANGED, { layout, button }), 0);
  };

  const handleViewMapClick = (): void => {
    setMobileView('map');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => track(ANALYTICS_EVENTS.CALENDAR_VIEW_MAP_CLICKED, { locale }), 0);
  };

  const handleViewListClick = (): void => {
    setMobileView('list');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => track(ANALYTICS_EVENTS.MAP_VIEW_LIST_CLICKED, { locale }), 0);
  };

  const focusRaceOnMap = useCallback((raceId: string) => {
    setFocusRaceId(raceId);
    setFocusRaceNonce((n) => n + 1);
  }, []);

  const handleRaceCardClick = useCallback(
    (raceId: string, raceSlug: string) => {
      const hasPin = filteredMarkers.some((m) =>
        m.races.some((r) => r.id === raceId),
      );
      if (isDesktopMap && hasPin) {
        focusRaceOnMap(raceId);
        return;
      }
      router.push(`/${locale}/carrera/${raceSlug}`);
    },
    [focusRaceOnMap, isDesktopMap, filteredMarkers, locale, router],
  );

  /** Split column — sticky map; height on map root. */
  const mapPanelClassNameDesktop =
    'h-[min(78vh,640px)] min-h-[280px] lg:min-h-[360px]';

  /** Full-width map below filters on small screens. */
  const mapPanelClassNameMobile =
    'h-[min(85dvh,720px)] min-h-[280px]';

  const hasServerMarkers = markers.length > 0;

  const showListPanel = isDesktopMap ? desktopLayout !== 'map' : mobileView === 'list';
  const showMapPanel = isDesktopMap ? desktopLayout !== 'list' : mobileView === 'map';

  const showMobileMapFab = !isDesktopMap && hasServerMarkers;

  /** Capsule / pill: override Button `rounded-md`; generous horizontal padding. */
  const mapToggleFabClassName =
    '!rounded-full px-5 py-1 min-h-12 whitespace-nowrap shadow-lg';

  return (
    <>
      <section className={`w-full min-w-0 ${isPillVariant ? 'sticky top-18 z-20 bg-white py-3 border-b border-gray-200 sm:static sm:z-auto sm:py-0 sm:pb-6 sm:border-none' : 'pb-6 lg:pb-8'}`}>
        <div className="relative max-w-4xl mx-auto min-w-0 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          {isPillVariant && <>
            {canScrollLeft && <div className="pointer-events-none absolute inset-y-0 left-4 w-6 bg-linear-to-r from-white/70 to-transparent z-10 sm:hidden" />}
            {canScrollRight && <div className="pointer-events-none absolute inset-y-0 right-4 w-6 bg-linear-to-l from-white/70 to-transparent z-10 sm:hidden" />}
          </>}
          <div className={`${isControlVariant || isPillVariant ? 'flex' : 'hidden sm:flex'} items-center gap-4`}>
            {isPillVariant ? (
              <div className="w-full min-w-0">
                <FilterBadgeBar
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
                  color={filterColor}
                  size="sm"
                  scrollContainerRef={pillsScrollRef}
                />
              </div>
            ) : (
              <FilterBar
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
                color={filterColor}
              />
            )}
            <div className="ml-auto hidden lg:block">
              <LayoutToggle value={desktopLayout} onChange={handleDesktopLayoutChange} />
            </div>
          </div>
        </div>
      </section>

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
                    className={`min-w-0 w-full min-h-0 ${desktopLayout === 'both' ? 'lg:w-1/2 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1' : 'lg:w-full'} ${showMobileMapFab && mobileView === 'list' ? 'pb-20' : ''}`}
                  >
                    <div className="grid min-h-[200px] min-w-0 grid-cols-1 gap-4">
                      {filteredRaces.length === 0 ? (
                        <EmptyState
                          icon={
                            <svg
                              className="mx-auto h-16 w-16 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          }
                          title={tResults('noRacesFound')}
                          description={tResults('noRacesMessage')}
                          action={
                            <Button onClick={handleClearFilters}>
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              {tFilters('clearFilters')}
                            </Button>
                          }
                        />
                      ) : (
                        filteredRaces.map((race) => {
                          const raceSlug = generateRaceSlug(race.name);
                          return (
                            <div key={race.id} className="min-w-0">
                              <ErrorBoundary
                                fallback={
                                  <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                                    <div className="text-center">
                                      <div className="mb-2">
                                        <svg
                                          className="mx-auto h-8 w-8 text-red-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                          />
                                        </svg>
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
                                <TrailRaceCard
                                  variant="compact"
                                  date={race.date}
                                  name={race.name}
                                  distanceKm={race.distanceKm}
                                  elevationGainM={race.elevationGainM}
                                  priceEur={race.priceEur ?? null}
                                  city={race.city}
                                  province={race.province}
                                  raceSlug={raceSlug}
                                  organizerId={race.organizerId}
                                  onCardClick={() =>
                                    handleRaceCardClick(race.id, raceSlug)
                                  }
                                />
                              </ErrorBoundary>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {showMapPanel && (
                  <div className={`min-w-0 w-full min-h-0 shrink-0 ${desktopLayout === 'both' ? 'lg:w-1/2' : 'lg:w-full'} lg:self-start`}>
                    {!hasServerMarkers ? (
                      <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                        {tMap('empty')}
                      </p>
                    ) : (
                      <div className="w-full lg:sticky lg:top-6">
                        <RacesMap
                          markers={filteredMarkers}
                          locale={locale}
                          labels={labels}
                          className={
                            isDesktopMap
                              ? mapPanelClassNameDesktop
                              : mapPanelClassNameMobile
                          }
                          focusRaceId={focusRaceId}
                          focusRaceNonce={focusRaceNonce}
                          onMarkerPinClick={focusRaceOnMap}
                        />
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
          onApply={handleFiltersApply}
          onClear={handleClearFilters}
          initialMonth={selectedMonth}
          initialProvince={selectedProvince}
          initialDistance={selectedDistance}
          initialRaceType={selectedRaceType}
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

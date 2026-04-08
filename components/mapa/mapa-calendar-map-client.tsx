'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { useFeatureFlagVariantKey } from 'posthog-js/react';
import type { TrailRace } from '@/types/race.types';
import type { Locale } from '@/i18n';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';
import FilterBar from '@/components/filters/filter-bar';
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
import { useMobileFilters } from '@/components/providers/mobile-filters-provider';
import { filterHomeRaces, filterMapMarkersByRaceIds } from '@/lib/home-race-filters';
import { generateRaceSlug } from '@/lib/race-utils';

const RACE_TYPE_CATEGORY_KEYS: Record<string, string> = {
  'ultra-trail': 'ultra',
  'maraton': 'maraton',
  'media-maraton': 'media',
  'marcha': 'marcha',
  'km-vertical': 'vk',
  'backyard': 'backyard',
};

const FILTER_STORAGE_KEYS = {
  month: 'filter_month',
  province: 'filter_province',
  distance: 'filter_distance',
  type: 'filter_type',
} as const;

const readFilterStorage = (key: string): string => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(key) ?? '';
};

type MobileView = 'list' | 'map';

interface MapaCalendarMapClientProps {
  races: TrailRace[];
  markers: RaceMapMarker[];
  locale: Locale;
  labels: MapPageLabels;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
}

export default function MapaCalendarMapClient({
  races,
  markers,
  locale,
  labels,
  showProvinceFilter = true,
  showDistanceFilter = true,
}: MapaCalendarMapClientProps) {
  const tResults = useTranslations('results');
  const tFilters = useTranslations('filters');
  const tErrors = useTranslations('errors');
  const tMap = useTranslations('map');
  const tMonthsFull = useTranslations('monthsFull');
  const tDistanceGroups = useTranslations('distanceGroups');
  const tCategory = useTranslations('category');

  const [selectedMonth, setSelectedMonth] = useState<string>(() => readFilterStorage(FILTER_STORAGE_KEYS.month));
  const [selectedProvince, setSelectedProvince] = useState<string>(() => readFilterStorage(FILTER_STORAGE_KEYS.province));
  const [selectedDistance, setSelectedDistance] = useState<string>(() => readFilterStorage(FILTER_STORAGE_KEYS.distance));
  const [selectedRaceType, setSelectedRaceType] = useState<string>(() => readFilterStorage(FILTER_STORAGE_KEYS.type));
  const [focusRaceId, setFocusRaceId] = useState<string | null>(null);
  const [focusRaceNonce, setFocusRaceNonce] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [desktopLayout, setDesktopLayout] = useState<DesktopLayout>('both');

  const router = useRouter();
  const isDesktopMap = useMinWidthLg();
  const filterVariant = useFeatureFlagVariantKey('filter-flag');
  const isControlVariant = filterVariant === 'control';
  const isInlineTextVariant = filterVariant === 'inline-text';
  const activeFilterLabels: string[] = [
    ...(selectedMonth !== '' ? [tMonthsFull(selectedMonth)] : []),
    ...(selectedProvince !== '' ? [selectedProvince] : []),
    ...(selectedDistance !== '' ? [tDistanceGroups(selectedDistance)] : []),
    ...(selectedRaceType !== '' ? [tCategory(RACE_TYPE_CATEGORY_KEYS[selectedRaceType])] : []),
  ];
  const { isOpen: isFiltersModalOpen, open: openFiltersModal, close: closeFiltersModal, register, unregister, updateFilterCount, updateFilterVariant, filterCount } = useMobileFilters();

  useEffect(() => {
    updateFilterVariant(filterVariant);
  }, [filterVariant, updateFilterVariant]);

  useEffect(() => {
    if (isControlVariant) return;
    register();
    return () => unregister();
  }, [isControlVariant, register, unregister]);

  useEffect(() => {
    updateFilterCount(
      (selectedMonth ? 1 : 0) +
      (selectedProvince ? 1 : 0) +
      (selectedDistance ? 1 : 0) +
      (selectedRaceType ? 1 : 0),
    );
  }, [selectedMonth, selectedProvince, selectedDistance, selectedRaceType, updateFilterCount]);

  useEffect(() => {
    sessionStorage.setItem(FILTER_STORAGE_KEYS.month, selectedMonth);
    sessionStorage.setItem(FILTER_STORAGE_KEYS.province, selectedProvince);
    sessionStorage.setItem(FILTER_STORAGE_KEYS.distance, selectedDistance);
    sessionStorage.setItem(FILTER_STORAGE_KEYS.type, selectedRaceType);
  }, [selectedMonth, selectedProvince, selectedDistance, selectedRaceType]);

  const filteredRaces = useMemo(
    () => filterHomeRaces(races, selectedMonth, selectedProvince, selectedDistance, selectedRaceType),
    [races, selectedMonth, selectedProvince, selectedDistance, selectedRaceType],
  );

  const filteredMarkers = useMemo(() => {
    const ids = new Set(filteredRaces.map((r) => r.id));
    return filterMapMarkersByRaceIds(markers, ids);
  }, [markers, filteredRaces]);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setTimeout(() => {
      posthog.capture('race_month_filter_applied', { month });
      if (isControlVariant) posthog.capture('filters_applied', { variant: 'control' });
    }, 0);
  };

  const handleProvinceSelect = (province: string) => {
    setSelectedProvince(province);
    setTimeout(() => {
      posthog.capture('race_province_filter_applied', { province });
      if (isControlVariant) posthog.capture('filters_applied', { variant: 'control' });
    }, 0);
  };

  const handleDistanceSelect = (distance: string) => {
    setSelectedDistance(distance);
    setTimeout(() => posthog.capture('race_distance_filter_applied', { distance }), 0);
  };

  const handleRaceTypeSelect = (raceType: string) => {
    setSelectedRaceType(raceType);
    setTimeout(() => posthog.capture('race_type_filter_applied', { raceType }), 0);
  };

  const handleRetry = () => {
    setSelectedMonth('');
    setSelectedProvince('');
    window.location.reload();
  };

  const handleClearFilters = () => {
    setSelectedMonth('');
    setSelectedProvince('');
    setSelectedDistance('');
    setSelectedRaceType('');
    setTimeout(() => posthog.capture('race_filters_cleared'), 0);
  };

  const handleFiltersApply = (month: string, province: string, distance: string, raceType: string) => {
    if (month !== selectedMonth) {
      setSelectedMonth(month);
      setTimeout(() => posthog.capture('race_month_filter_applied', { month }), 0);
    }
    if (province !== selectedProvince) {
      setSelectedProvince(province);
      setTimeout(() => posthog.capture('race_province_filter_applied', { province }), 0);
    }
    if (distance !== selectedDistance) {
      setSelectedDistance(distance);
      setTimeout(() => posthog.capture('race_distance_filter_applied', { distance }), 0);
    }
    if (raceType !== selectedRaceType) {
      setSelectedRaceType(raceType);
      setTimeout(() => posthog.capture('race_type_filter_applied', { raceType }), 0);
    }
    setTimeout(() => posthog.capture('filters_applied', { variant: filterVariant }), 0);
    closeFiltersModal();
  };

  const handleDesktopLayoutChange = (layout: DesktopLayout, button: LayoutToggleButton): void => {
    setDesktopLayout(layout);
    setTimeout(() => posthog.capture('desktop_layout_changed', { layout, button }), 0);
  };

  const handleViewMapClick = (): void => {
    setMobileView('map');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => posthog.capture('calendar_view_map_clicked', { locale }), 0);
  };

  const handleViewListClick = (): void => {
    setMobileView('list');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => posthog.capture('map_view_list_clicked', { locale }), 0);
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
      <section className="w-full min-w-0 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto min-w-0 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className={`${isControlVariant ? 'flex' : 'hidden sm:flex'} items-center gap-4`}>
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
            />
            <div className="ml-auto hidden lg:block">
              <LayoutToggle value={desktopLayout} onChange={handleDesktopLayoutChange} />
            </div>
          </div>
        </div>
      </section>

      {isInlineTextVariant && (
        <section className="sm:hidden sticky top-16 z-30 w-full min-w-0 py-2 px-3 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full">
            <button
              onClick={() => {
                openFiltersModal();
                setTimeout(() => posthog.capture('navbar_filter_icon_clicked', { filter_count: filterCount, variant: filterVariant }), 0);
              }}
              className="w-full flex items-center justify-center py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-400 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {tFilters('filterRacesButton')}
            </button>
            {activeFilterLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeFilterLabels.map((label) => (
                  <span key={label} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-sm font-medium">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
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

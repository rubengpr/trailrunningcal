'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import type { TrailRace } from '@/types/race.types';
import type { Locale } from '@/i18n';
import type { MapPageLabels, RaceMapMarker } from '@/types/map.types';
import MonthFilter from '@/components/filters/month-filter';
import MobileFiltersModal from '@/components/filters/mobile-filters-modal';
import TrailRaceCard from '@/components/race/trail-race-card';
import ErrorBoundary from '@/components/ui/error-boundary';
import { SearchError } from '@/components/ui/error-message';
import ProvinceFilter from '@/components/filters/province-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import RacesMap from '@/components/races-map/races-map';
import { useMinWidthLg } from '@/hooks/use-min-width-lg';
import { useMobileFilters } from '@/components/providers/mobile-filters-provider';
import { filterHomeRaces, filterMapMarkersByRaceIds } from '@/lib/home-race-filters';
import { generateRaceSlug } from '@/lib/race-utils';

type MobileView = 'list' | 'map';

interface MapaCalendarMapClientProps {
  races: TrailRace[];
  markers: RaceMapMarker[];
  locale: Locale;
  labels: MapPageLabels;
  showProvinceFilter?: boolean;
}

export default function MapaCalendarMapClient({
  races,
  markers,
  locale,
  labels,
  showProvinceFilter = true,
}: MapaCalendarMapClientProps) {
  const tResults = useTranslations('results');
  const tFilters = useTranslations('filters');
  const tErrors = useTranslations('errors');
  const tMap = useTranslations('map');

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [focusRaceId, setFocusRaceId] = useState<string | null>(null);
  const [focusRaceNonce, setFocusRaceNonce] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>('list');

  const router = useRouter();
  const isDesktopMap = useMinWidthLg();
  const { isOpen: isFiltersModalOpen, open: openFiltersModal, close: closeFiltersModal, register, unregister, updateFilterCount } = useMobileFilters();

  useEffect(() => {
    register();
    return () => unregister();
  }, [register, unregister]);

  useEffect(() => {
    updateFilterCount((selectedMonth ? 1 : 0) + (selectedProvince ? 1 : 0));
  }, [selectedMonth, selectedProvince, updateFilterCount]);

  const filteredRaces = useMemo(
    () => filterHomeRaces(races, selectedMonth, selectedProvince),
    [races, selectedMonth, selectedProvince],
  );

  const filteredMarkers = useMemo(() => {
    const ids = new Set(filteredRaces.map((r) => r.id));
    return filterMapMarkersByRaceIds(markers, ids);
  }, [markers, filteredRaces]);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setTimeout(() => posthog.capture('race_month_filter_applied', { month }), 0);
  };

  const handleProvinceSelect = (province: string) => {
    setSelectedProvince(province);
    setTimeout(() => posthog.capture('race_province_filter_applied', { province }), 0);
  };

  const handleRetry = () => {
    setSelectedMonth('');
    setSelectedProvince('');
    window.location.reload();
  };

  const handleClearFilters = () => {
    setSelectedMonth('');
    setSelectedProvince('');
    setTimeout(() => posthog.capture('race_filters_cleared'), 0);
  };

  const handleFiltersApply = (month: string, province: string) => {
    if (month !== selectedMonth) {
      setSelectedMonth(month);
      setTimeout(() => posthog.capture('race_month_filter_applied', { month }), 0);
    }
    if (province !== selectedProvince) {
      setSelectedProvince(province);
      setTimeout(() => posthog.capture('race_province_filter_applied', { province }), 0);
    }
    closeFiltersModal();
  };

  const handleViewMapClick = (): void => {
    setMobileView('map');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => posthog.capture('calendar_view_map_clicked', { locale }), 0);
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

  const showListPanel = isDesktopMap || mobileView === 'list';
  const showMapPanel = isDesktopMap || mobileView === 'map';

  const showMobileMapFab = !isDesktopMap && hasServerMarkers;

  /** Capsule / pill: override Button `rounded-md`; generous horizontal padding. */
  const mapToggleFabClassName =
    '!rounded-full px-5 py-1 min-h-12 whitespace-nowrap shadow-lg';

  return (
    <>
      <section className="w-full min-w-0 pb-6 lg:pb-8">
        <div className="max-w-4xl mx-auto min-w-0 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="hidden sm:flex justify-center mb-3">
            <MonthFilter
              initialSelectedMonth={selectedMonth}
              onMonthSelect={handleMonthSelect}
            />
          </div>
          {showProvinceFilter && (
            <div className="hidden sm:flex justify-center gap-2">
              <ProvinceFilter selectedProvince={selectedProvince} onProvinceSelect={handleProvinceSelect} />
            </div>
          )}
        </div>
      </section>

      <main className="min-w-0">
        <ErrorBoundary fallback={<SearchError onRetry={handleRetry} />}>
          <section id="carreras">
            <div className="mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
              <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                {showListPanel && (
                  <div
                    className={`min-w-0 w-full min-h-0 lg:w-1/2 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1 ${showMobileMapFab && mobileView === 'list' ? 'pb-20' : ''
                      }`}
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
                  <div className="min-w-0 w-full min-h-0 shrink-0 lg:w-1/2 lg:self-start">
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

      <MobileFiltersModal
        isOpen={isFiltersModalOpen}
        onClose={closeFiltersModal}
        onApply={handleFiltersApply}
        onClear={handleClearFilters}
        initialMonth={selectedMonth}
        initialProvince={selectedProvince}
      />

      {showMobileMapFab && (
        <div className="lg:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2">
          {mobileView === 'list' ? (
            <Button
              type="button"
              variant="primary"
              className={mapToggleFabClassName}
              onClick={handleViewMapClick}
            >
              {tMap('viewMap')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              className={mapToggleFabClassName}
              onClick={() => setMobileView('list')}
            >
              {tMap('viewList')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

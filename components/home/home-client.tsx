'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import type { TrailRace } from '@/types/race.types';
import MonthFilter from '@/components/filters/month-filter';
import TrailRaceCard from '@/components/race/trail-race-card';
import ErrorBoundary from '@/components/ui/error-boundary';
import { SearchError } from '@/components/ui/error-message';
import ProvinceFilter from '@/components/filters/province-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { generateRaceSlug } from '@/lib/race-utils';

interface HomeClientProps {
  races: TrailRace[];
  showProvinceFilter?: boolean;
}

export default function HomeClient({ races, showProvinceFilter = true }: HomeClientProps) {
  const tResults = useTranslations('results');
  const tFilters = useTranslations('filters');
  const tErrors = useTranslations('errors');

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  const racesWithDates = useMemo(() =>
    races.map((race) => {
      if (!race.date) return { race, parsedDate: null };
      const d = new Date(race.date);
      d.setHours(0, 0, 0, 0);
      return { race, parsedDate: d };
    }),
    [races]
  );

  const filteredRaces = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthNumber = selectedMonth ? parseInt(selectedMonth, 10) : null;

    return racesWithDates
      .filter(({ parsedDate }) => !parsedDate || parsedDate > today)
      .filter(({ parsedDate }) => monthNumber === null ? true : parsedDate !== null && parsedDate.getMonth() === monthNumber)
      .filter(({ race }) => !selectedProvince || race.province === selectedProvince)
      .map(({ race }) => race);
  }, [racesWithDates, selectedMonth, selectedProvince]);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setTimeout(() => posthog.capture('race_month_filter_applied', { month }), 0);
  };

  const handleProvinceSelect = (province: string) => {
    setSelectedProvince(province);
    setTimeout(() => posthog.capture('race_province_filter_applied', { province }), 0);
  };

  const handleRetry = () => {
    // Reset filters to trigger a fresh data load
    setSelectedMonth('');
    setSelectedProvince('');
    window.location.reload();
  };

  const handleClearFilters = () => {
    setSelectedMonth('');
    setSelectedProvince('');
    setTimeout(() => posthog.capture('race_filters_cleared'), 0);
  };

  return (
    <>
      {/* Filters section */}
      <section className="w-full pt-4 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-3">
            <MonthFilter
              initialSelectedMonth={selectedMonth}
              onMonthSelect={handleMonthSelect}
            />
          </div>
          {showProvinceFilter && (
            <div className="flex justify-center gap-2">
              <ProvinceFilter onProvinceSelect={handleProvinceSelect} />
            </div>
          )}
        </div>
      </section>

      <main>
        <ErrorBoundary
          fallback={<SearchError onRetry={handleRetry} />}
        >
          <section id="carreras" className="py-4">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid gap-4 min-h-[400px]">
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
                  filteredRaces.map((race) => (
                    <div key={race.id}>
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
                          date={race.date}
                          name={race.name}
                          distanceKm={race.distanceKm}
                          elevationGainM={race.elevationGainM}
                          priceEur={race.priceEur ?? null}
                          city={race.city}
                          province={race.province}
                          raceSlug={generateRaceSlug(race.name)}
                          organizerId={race.organizerId}
                        />
                      </ErrorBoundary>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </ErrorBoundary>
      </main>
    </>
  );
}

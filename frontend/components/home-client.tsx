'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import type { TrailRace } from '../types/race.types';
import SearchBar from './search-bar';
import MonthFilter from './month-filter';
import TrailRaceCard from './trail-race-card';
import ErrorBoundary from './error-boundary';
import { SearchError } from './error-message';
import { getMonthNumber } from '../lib/date-utils';
import ProvinceFilter from './province-filter';
import { generateRaceSlug } from '../lib/race-utils';

interface HomeClientProps {
  races: TrailRace[];
}

export default function HomeClient({ races }: HomeClientProps) {
  const tSearch = useTranslations('search');
  const tResults = useTranslations('results');
  const tFilters = useTranslations('filters');
  const tErrors = useTranslations('errors');

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredRaces = useMemo(() => {
    let filtered = races;

    // Filter by date - only show races with dates higher than today or races without dates
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    filtered = filtered.filter((race) => {
      if (!race.date) return true; // Include races with null dates (TBD races)
      const raceDate = new Date(race.date);
      raceDate.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      return raceDate > today;
    });

    // Filter by month if selected
    if (selectedMonth) {
      const monthNumber = getMonthNumber(selectedMonth);
      filtered = filtered.filter((race) => {
        if (!race.date) return false; // Exclude races with null dates from month filtering
        const raceDate = new Date(race.date);
        return raceDate.getMonth() === monthNumber;
      });
    }

    //Filter by province if selected
    if (selectedProvince) {
      //Filtrar por provincia del objeto
      filtered = filtered.filter((race) => {
        const raceProvince = race.province;
        return raceProvince === selectedProvince;
      });
    }

    // Filter by search term if provided
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (race) =>
          race.name.toLowerCase().includes(searchLower) ||
          race.city.toLowerCase().includes(searchLower) ||
          race.province.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [races, selectedMonth, selectedProvince, searchTerm]);

  const handleMonthSelect = (month: string) => {
    posthog.capture('race_month_filter_applied', { month: month });
    setSelectedMonth(month);
  };

  const handleProvinceSelect = (province: string) => {
    posthog.capture('race_province_filter_applied', { province: province });
    setSelectedProvince(province);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleRetry = () => {
    // Reset filters to trigger a fresh data load
    setSelectedMonth('');
    setSelectedProvince('');
    setSearchTerm('');
    window.location.reload();
  };

  const handleClearFilters = () => {
    posthog.capture('race_filters_cleared');
    setSelectedMonth('');
    setSelectedProvince('');
    setSearchTerm('');
  };

  return (
    <>
      {/* Search section */}
      <section className="w-full py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <SearchBar
              initialSearchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              placeholder={tSearch('placeholder')}
            />
          </div>
          <div className="flex justify-center mb-3">
            <MonthFilter
              initialSelectedMonth={selectedMonth}
              onMonthSelect={handleMonthSelect}
            />
          </div>
          <div className="flex justify-center gap-2">
            <ProvinceFilter onProvinceSelect={handleProvinceSelect} />
          </div>
        </div>
      </section>

      <main>
        <ErrorBoundary
          fallback={<SearchError onRetry={handleRetry} />}
          onError={(error, errorInfo) => {
            console.error('Error in main content area:', error, errorInfo);
          }}
        >
          <section id="carreras" className="py-4">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid gap-4">
                {filteredRaces.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="max-w-md mx-auto">
                      <div className="mb-6">
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
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {tResults('noRacesFound')}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {tResults('noRacesMessage')}
                      </p>
                      <button
                        onClick={handleClearFilters}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                      >
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
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredRaces.map((race, index) => (
                    <div key={index}>
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
                          priceEur={race.priceEur}
                          city={race.city}
                          province={race.province}
                          raceSlug={generateRaceSlug(race.name)}
                          isVerifiedOrganizer={race.isVerifiedOrganizer}
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

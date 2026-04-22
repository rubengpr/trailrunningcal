'use client';

import type { RefObject } from 'react';
import FilterBar from '@/components/filters/filter-bar';
import { LayoutToggle } from '@/components/ui/layout-toggle';
import type { DesktopLayout, LayoutToggleButton } from '@/components/ui/layout-toggle';

interface RacesExplorerFiltersSectionProps {
  filterLayout: string;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  selectedMonth: string[];
  selectedProvince: string[];
  selectedDistance: string[];
  selectedRaceType: string[];
  onMonthSelect: (month: string[]) => void;
  onProvinceSelect: (province: string[]) => void;
  onDistanceSelect: (distance: string[]) => void;
  onRaceTypeSelect: (raceType: string[]) => void;
  onClearFilters: () => void;
  showProvinceFilter: boolean;
  showDistanceFilter: boolean;
  filterColor: 'white' | 'black';
  desktopLayout: DesktopLayout;
  onDesktopLayoutChange: (layout: DesktopLayout, button: LayoutToggleButton) => void;
  pillsScrollRef: RefObject<HTMLDivElement | null>;
}

export default function RacesExplorerFiltersSection({
  filterLayout,
  canScrollLeft,
  canScrollRight,
  selectedMonth,
  selectedProvince,
  selectedDistance,
  selectedRaceType,
  onMonthSelect,
  onProvinceSelect,
  onDistanceSelect,
  onRaceTypeSelect,
  onClearFilters,
  showProvinceFilter,
  showDistanceFilter,
  filterColor,
  desktopLayout,
  onDesktopLayoutChange,
  pillsScrollRef,
}: RacesExplorerFiltersSectionProps) {
  const isPillVariant = filterLayout === 'pill';
  const isControlVariant = filterLayout === 'control';
  const showInlineFilters = isControlVariant || isPillVariant;

  return (
    <section className={`w-full min-w-0 ${isPillVariant ? 'sticky top-18 z-20 bg-white py-3 border-b border-gray-200 sm:static sm:z-auto sm:py-0 sm:pb-6 sm:border-none' : 'pb-6 lg:pb-8'}`}>
      <div className="relative max-w-4xl mx-auto min-w-0 px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        {isPillVariant && <>
          {canScrollLeft && <div className="pointer-events-none absolute inset-y-0 left-4 w-6 bg-linear-to-r from-white/70 to-transparent z-10 sm:hidden" />}
          {canScrollRight && <div className="pointer-events-none absolute inset-y-0 right-4 w-6 bg-linear-to-l from-white/70 to-transparent z-10 sm:hidden" />}
        </>}
        <div className={`${showInlineFilters ? 'flex' : 'hidden sm:flex'} items-center gap-4`}>
          <div className="w-full min-w-0">
            <FilterBar
              selectedMonth={selectedMonth}
              selectedProvince={selectedProvince}
              selectedDistance={selectedDistance}
              selectedRaceType={selectedRaceType}
              onMonthSelect={onMonthSelect}
              onProvinceSelect={onProvinceSelect}
              onDistanceSelect={onDistanceSelect}
              onRaceTypeSelect={onRaceTypeSelect}
              onClearFilters={onClearFilters}
              showProvinceFilter={showProvinceFilter}
              showDistanceFilter={showDistanceFilter}
              variant={isPillVariant ? 'pill' : 'control'}
              color={filterColor}
              size={isPillVariant ? 'sm' : 'md'}
              scrollContainerRef={isPillVariant ? pillsScrollRef : undefined}
            />
          </div>
          <div className="ml-auto hidden lg:block">
            <LayoutToggle value={desktopLayout} onChange={onDesktopLayoutChange} />
          </div>
        </div>
      </div>
    </section>
  );
}

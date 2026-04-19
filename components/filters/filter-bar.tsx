'use client';

import type { RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { FilterSelect } from '@/components/ui/filter-select';
import { PROVINCES, DISTANCE_GROUPS, MONTH_INDICES } from '@/lib/constants';
import { RACE_TYPES, RACE_TYPE_CATEGORY_KEYS } from '@/lib/home-race-filters';

interface FilterBarProps {
  selectedMonth: string[];
  selectedProvince: string[];
  selectedDistance: string[];
  selectedRaceType: string[];
  onMonthSelect: (month: string[]) => void;
  onProvinceSelect: (province: string[]) => void;
  onDistanceSelect: (distance: string[]) => void;
  onRaceTypeSelect: (raceType: string[]) => void;
  onClearFilters: () => void;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
  variant?: 'control' | 'pill';
  color?: 'white' | 'black';
  size?: 'sm' | 'md';
  scrollContainerRef?: RefObject<HTMLDivElement>;
}

export function FilterBadgeBar(props: Omit<FilterBarProps, 'variant'>) {
  return <FilterBar {...props} variant="pill" />;
}

export default function FilterBar({
  selectedMonth,
  selectedProvince,
  selectedDistance,
  selectedRaceType,
  onMonthSelect,
  onProvinceSelect,
  onDistanceSelect,
  onRaceTypeSelect,
  onClearFilters,
  showProvinceFilter = true,
  showDistanceFilter = true,
  variant = 'control',
  color = 'white',
  size = 'md',
  scrollContainerRef,
}: FilterBarProps) {
  const tFilters = useTranslations('filters');
  const tMonthsFull = useTranslations('monthsFull');
  const tDistanceGroups = useTranslations('distanceGroups');
  const tCategory = useTranslations('category');

  const monthOptions = MONTH_INDICES.map((index) => ({
    value: index.toString(),
    label: tMonthsFull(index.toString()),
  }));

  const provinceOptions = PROVINCES.map((province) => ({
    value: province,
    label: province,
  }));

  const distanceOptions = DISTANCE_GROUPS.map((group) => ({
    value: group,
    label: tDistanceGroups(group),
  }));

  const raceTypeOptions = RACE_TYPES.map((type) => ({
    value: type,
    label: tCategory(RACE_TYPE_CATEGORY_KEYS[type]),
  }));

  const hasActiveFilters =
    selectedMonth.length > 0 ||
    selectedProvince.length > 0 ||
    selectedDistance.length > 0 ||
    selectedRaceType.length > 0;

  return (
    <div ref={scrollContainerRef} className={`flex items-center ${variant === 'pill' ? 'gap-2 flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]' : 'gap-3 flex-wrap'}`}>
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center justify-center py-2 px-2 shrink-0 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
      <FilterSelect
        value={selectedMonth}
        onValueChange={onMonthSelect}
        placeholder={tFilters('monthLabel')}
        options={monthOptions}
        variant={variant}
        color={color}
        size={size}
      />

      {showProvinceFilter && (
        <FilterSelect
          value={selectedProvince}
          onValueChange={onProvinceSelect}
          placeholder={tFilters('provinceLabel')}
          options={provinceOptions}
          variant={variant}
          color={color}
          size={size}
        />
      )}

      {showDistanceFilter && (
        <FilterSelect
          value={selectedDistance}
          onValueChange={onDistanceSelect}
          placeholder={tFilters('distanceLabel')}
          options={distanceOptions}
          variant={variant}
          color={color}
          size={size}
        />
      )}

      <FilterSelect
        value={selectedRaceType}
        onValueChange={onRaceTypeSelect}
        placeholder={tFilters('raceTypeLabel')}
        options={raceTypeOptions}
        variant={variant}
        color={color}
        size={size}
      />

    </div>
  );
}

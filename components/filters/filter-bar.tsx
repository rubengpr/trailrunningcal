'use client';

import type { RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { FilterSelect } from '@/components/filters/filter-select';
import FilterPill from '@/components/filters/filter-pill';
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
  variant: 'control' | 'pill';
  color?: 'white' | 'black';
  size?: 'sm' | 'md';
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
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
  variant,
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

  const toggleSelectedValues = (
    selectedValues: string[],
    value: string,
    onChange: (values: string[]) => void,
  ): void => {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value],
    );
  };

  return (
    <div ref={scrollContainerRef} className={`flex items-center ${variant === 'pill' ? 'gap-2 flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]' : 'gap-3 flex-wrap'}`}>
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center justify-center py-2 px-2 shrink-0 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
      {variant === 'pill' ? (
        <FilterPill
          label={tFilters('monthLabel')}
          selectedValues={selectedMonth}
          options={monthOptions}
          onToggleOption={(value) => toggleSelectedValues(selectedMonth, value, onMonthSelect)}
          onClear={() => onMonthSelect([])}
          color={color}
          size={size}
        />
      ) : (
        <FilterSelect
          value={selectedMonth}
          onValueChange={onMonthSelect}
          placeholder={tFilters('monthLabel')}
          options={monthOptions}
          color={color}
        />
      )}

      {showProvinceFilter && (
        variant === 'pill' ? (
          <FilterPill
            label={tFilters('provinceLabel')}
            selectedValues={selectedProvince}
            options={provinceOptions}
            onToggleOption={(value) => toggleSelectedValues(selectedProvince, value, onProvinceSelect)}
            onClear={() => onProvinceSelect([])}
            color={color}
            size={size}
          />
        ) : (
          <FilterSelect
            value={selectedProvince}
            onValueChange={onProvinceSelect}
            placeholder={tFilters('provinceLabel')}
            options={provinceOptions}
            color={color}
          />
        )
      )}

      {showDistanceFilter && (
        variant === 'pill' ? (
          <FilterPill
            label={tFilters('distanceLabel')}
            selectedValues={selectedDistance}
            options={distanceOptions}
            onToggleOption={(value) => toggleSelectedValues(selectedDistance, value, onDistanceSelect)}
            onClear={() => onDistanceSelect([])}
            color={color}
            size={size}
          />
        ) : (
          <FilterSelect
            value={selectedDistance}
            onValueChange={onDistanceSelect}
            placeholder={tFilters('distanceLabel')}
            options={distanceOptions}
            color={color}
          />
        )
      )}

      {variant === 'pill' ? (
        <FilterPill
          label={tFilters('raceTypeLabel')}
          selectedValues={selectedRaceType}
          options={raceTypeOptions}
          onToggleOption={(value) => toggleSelectedValues(selectedRaceType, value, onRaceTypeSelect)}
          onClear={() => onRaceTypeSelect([])}
          color={color}
          size={size}
        />
      ) : (
        <FilterSelect
          value={selectedRaceType}
          onValueChange={onRaceTypeSelect}
          placeholder={tFilters('raceTypeLabel')}
          options={raceTypeOptions}
          color={color}
        />
      )}

    </div>
  );
}

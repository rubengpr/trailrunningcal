'use client';

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
  variant?: 'select' | 'pill';
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
  variant = 'select',
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
    <div className={`flex items-center flex-wrap ${variant === 'pill' ? 'gap-2' : 'gap-3'}`}>
      <FilterSelect
        value={selectedMonth}
        onValueChange={onMonthSelect}
        placeholder={tFilters('monthLabel')}
        options={monthOptions}
        variant={variant}
      />

      {showProvinceFilter && (
        <FilterSelect
          value={selectedProvince}
          onValueChange={onProvinceSelect}
          placeholder={tFilters('provinceLabel')}
          options={provinceOptions}
          variant={variant}
        />
      )}

      {showDistanceFilter && (
        <FilterSelect
          value={selectedDistance}
          onValueChange={onDistanceSelect}
          placeholder={tFilters('distanceLabel')}
          options={distanceOptions}
          variant={variant}
        />
      )}

      <FilterSelect
        value={selectedRaceType}
        onValueChange={onRaceTypeSelect}
        placeholder={tFilters('raceTypeLabel')}
        options={raceTypeOptions}
        variant={variant}
      />

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        >
          {tFilters('clearFilters')}
        </button>
      )}
    </div>
  );
}

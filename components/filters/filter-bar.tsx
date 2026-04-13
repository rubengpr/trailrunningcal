'use client';

import { useTranslations } from 'next-intl';
import { FilterSelect } from '@/components/ui/filter-select';
import { PROVINCES, DISTANCE_GROUPS, MONTH_INDICES } from '@/lib/constants';
import { RACE_TYPES } from '@/lib/home-race-filters';

const RACE_TYPE_CATEGORY_KEYS: Record<string, string> = {
  'ultra-trail': 'ultra',
  'maraton': 'maraton',
  'media-maraton': 'media',
  'marcha': 'marcha',
  'km-vertical': 'vk',
  'backyard': 'backyard',
};

interface FilterBarProps {
  selectedMonth: string;
  selectedProvince: string;
  selectedDistance: string;
  selectedRaceType: string;
  onMonthSelect: (month: string) => void;
  onProvinceSelect: (province: string) => void;
  onDistanceSelect: (distance: string) => void;
  onRaceTypeSelect: (raceType: string) => void;
  onClearFilters: () => void;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
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
    selectedMonth !== '' || selectedProvince !== '' || selectedDistance !== '' || selectedRaceType !== '';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <FilterSelect
        value={selectedMonth}
        onValueChange={onMonthSelect}
        placeholder={tFilters('monthLabel')}
        options={monthOptions}
      />

      {showProvinceFilter && (
        <FilterSelect
          value={selectedProvince}
          onValueChange={onProvinceSelect}
          placeholder={tFilters('provinceLabel')}
          options={provinceOptions}
        />
      )}

      {showDistanceFilter && (
        <FilterSelect
          value={selectedDistance}
          onValueChange={onDistanceSelect}
          placeholder={tFilters('distanceLabel')}
          options={distanceOptions}
        />
      )}

      <FilterSelect
        value={selectedRaceType}
        onValueChange={onRaceTypeSelect}
        placeholder={tFilters('raceTypeLabel')}
        options={raceTypeOptions}
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

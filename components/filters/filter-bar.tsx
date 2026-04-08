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

  const months = MONTH_INDICES.map((index) => ({
    key: index.toString(),
    label: tMonthsFull(index.toString()),
  }));

  const hasActiveFilters =
    selectedMonth !== '' || selectedProvince !== '' || selectedDistance !== '' || selectedRaceType !== '';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <FilterSelect value={selectedMonth} onChange={(e) => onMonthSelect(e.target.value)}>
        <option value="">{tFilters('monthLabel')}</option>
        {months.map((month) => (
          <option key={month.key} value={month.key}>{month.label}</option>
        ))}
      </FilterSelect>

      {showProvinceFilter && (
        <FilterSelect value={selectedProvince} onChange={(e) => onProvinceSelect(e.target.value)}>
          <option value="">{tFilters('provinceLabel')}</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>{province}</option>
          ))}
        </FilterSelect>
      )}

      {showDistanceFilter && (
        <FilterSelect value={selectedDistance} onChange={(e) => onDistanceSelect(e.target.value)}>
          <option value="">{tFilters('distanceLabel')}</option>
          {DISTANCE_GROUPS.map((group) => (
            <option key={group} value={group}>{tDistanceGroups(group)}</option>
          ))}
        </FilterSelect>
      )}

      <FilterSelect value={selectedRaceType} onChange={(e) => onRaceTypeSelect(e.target.value)}>
        <option value="">{tFilters('raceTypeLabel')}</option>
        {RACE_TYPES.map((type) => (
          <option key={type} value={type}>{tCategory(RACE_TYPE_CATEGORY_KEYS[type])}</option>
        ))}
      </FilterSelect>

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

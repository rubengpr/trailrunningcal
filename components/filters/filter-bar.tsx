'use client';

import { useTranslations } from 'next-intl';
import { FilterSelect } from '@/components/ui/filter-select';

const MONTH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PROVINCES = ['Barcelona', 'Girona', 'Lleida', 'Tarragona'];
export const DISTANCE_GROUPS = ['0-10', '10-20', '20-30', '30-40', '40-50', '50+'] as const;
export type DistanceGroup = (typeof DISTANCE_GROUPS)[number];

interface FilterBarProps {
  selectedMonth: string;
  selectedProvince: string;
  selectedDistance: string;
  onMonthSelect: (month: string) => void;
  onProvinceSelect: (province: string) => void;
  onDistanceSelect: (distance: string) => void;
  onClearFilters: () => void;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
}

export default function FilterBar({
  selectedMonth,
  selectedProvince,
  selectedDistance,
  onMonthSelect,
  onProvinceSelect,
  onDistanceSelect,
  onClearFilters,
  showProvinceFilter = true,
  showDistanceFilter = true,
}: FilterBarProps) {
  const tFilters = useTranslations('filters');
  const tMonthsFull = useTranslations('monthsFull');
  const tDistanceGroups = useTranslations('distanceGroups');

  const months = MONTH_INDICES.map((index) => ({
    key: index.toString(),
    label: tMonthsFull(index.toString()),
  }));

  const hasActiveFilters = selectedMonth !== '' || selectedProvince !== '' || selectedDistance !== '';

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

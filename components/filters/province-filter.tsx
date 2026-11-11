'use client';

import { useLocale, useTranslations } from 'next-intl';
import { FilterOptionGroup } from '@/components/filters/filter-option-group';
import {
  GEOGRAPHY,
  getLocalizedProvinceGroups,
  type RegionId,
} from '@/lib/geography/destinations';

interface ProvinceFilterProps {
  selectedProvince: string[];
  onProvinceSelect: (provinces: string[]) => void;
  regionId?: RegionId;
}

export function ProvinceFilter({
  selectedProvince,
  onProvinceSelect,
  regionId,
}: ProvinceFilterProps) {
  const tProvince = useTranslations('provincia.names');
  const tGeography = useTranslations('geography.regions');
  const locale = useLocale();
  const groups = getLocalizedProvinceGroups({
    locale,
    regionId,
    getRegionLabel: tGeography,
    getProvinceLabel: tProvince,
  });
  const handleProvinceClick = (provinceName: string) => {
    const next = selectedProvince.includes(provinceName)
      ? selectedProvince.filter((p) => p !== provinceName)
      : [...selectedProvince, provinceName];
    onProvinceSelect(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ regionId: groupRegionId, provinceIds }) => (
        <section key={groupRegionId}>
          {!regionId && (
            <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {tGeography(groupRegionId)}
            </h3>
          )}
          <FilterOptionGroup
            options={provinceIds.map((provinceId) => ({
              value: GEOGRAPHY.provinces[provinceId].dbName,
              label: tProvince(provinceId),
            }))}
            selectedValues={selectedProvince}
            onToggle={handleProvinceClick}
            align="start"
          />
        </section>
      ))}
    </div>
  );
}

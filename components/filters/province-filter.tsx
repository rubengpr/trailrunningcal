'use client';

import { useLocale, useTranslations } from 'next-intl';
import { MultiSelectOption } from '@/components/ui/multi-select-option';
import { FilterChip } from '@/components/filters/filter-chip';
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
      {groups.map(({ regionId: groupRegionId, provinceIds }) => {
        const provinces: string[] = provinceIds.map((id) => GEOGRAPHY.provinces[id].dbName);
        const selected = provinces.every((province) => selectedProvince.includes(province));
        const indeterminate = !selected && provinces.some((province) => selectedProvince.includes(province));

        return (
          <section key={groupRegionId}>
            {!regionId && (
              <div className="mb-2">
                <MultiSelectOption
                  variant="group"
                  label={tGeography(groupRegionId)}
                  selected={selected}
                  indeterminate={indeterminate}
                  onClick={() => {
                    onProvinceSelect(selected
                      ? selectedProvince.filter((province) => !provinces.includes(province))
                      : [...new Set([...selectedProvince, ...provinces])]);
                  }}
                />
              </div>
            )}
            <div className={`flex flex-wrap gap-1.5 sm:gap-2 ${regionId ? '' : 'ml-4 pl-3'}`}>
              {provinceIds.map((provinceId) => {
                const province = GEOGRAPHY.provinces[provinceId].dbName;

                return (
                  <FilterChip
                    key={provinceId}
                    label={tProvince(provinceId)}
                    selected={selectedProvince.includes(province)}
                    onClick={() => handleProvinceClick(province)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

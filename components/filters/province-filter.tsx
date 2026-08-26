'use client';

import { useTranslations } from 'next-intl';
import {
  DESTINATION_PROVINCE_GROUPS,
  GEOGRAPHY,
} from '@/lib/geography/destinations';

interface ProvinceFilterProps {
  selectedProvince: string[];
  onProvinceSelect: (provinces: string[]) => void;
}

export function ProvinceFilter({
  selectedProvince,
  onProvinceSelect,
}: ProvinceFilterProps) {
  const tProvince = useTranslations('provincia.names');
  const tGeography = useTranslations('geography.regions');
  const handleProvinceClick = (provinceName: string) => {
    const next = selectedProvince.includes(provinceName)
      ? selectedProvince.filter((p) => p !== provinceName)
      : [...selectedProvince, provinceName];
    onProvinceSelect(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {DESTINATION_PROVINCE_GROUPS.map(({ regionId, provinceIds }) => (
        <section key={regionId}>
          <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {tGeography(regionId)}
          </h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {provinceIds.map((provinceId) => {
              const province = GEOGRAPHY.provinces[provinceId].dbName;

              return (
                <button
                  key={provinceId}
                  onClick={() => handleProvinceClick(province)}
                  className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 border border-gray-300 hover:border-gray-400 cursor-pointer focus:outline-none ${selectedProvince.includes(province)
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  {tProvince(provinceId)}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

'use client';

import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SelectMenu } from '@/components/ui/select-menu';
import { PROVINCES } from '@/lib/geography/provinces';
import { REGION_IDS } from '@/lib/geography/destinations';
import type { RegionId } from '@/lib/geography/destinations';
import { getRegionProvinces, parseLocationFilters } from '@/lib/geography/filters';

interface AdminEventsFiltersProps {
  action: string;
  inputId: string;
  initialQuery: string;
  initialProvince?: string;
  initialRegion?: RegionId;
  hiddenFields?: Record<string, string | undefined>;
}

export function AdminEventsFilters({
  action,
  inputId,
  initialQuery,
  initialProvince,
  initialRegion,
  hiddenFields,
}: AdminEventsFiltersProps): React.ReactElement {
  const t = useTranslations('adminEvents');
  const geographyT = useTranslations('geography.regions');
  const locale = useLocale();
  const [region, setRegion] = useState<RegionId | ''>(initialRegion ?? '');
  const [province, setProvince] = useState(initialProvince ?? '');
  const regionInputRef = useRef<HTMLInputElement>(null);
  const provinces = region ? getRegionProvinces(region) : PROVINCES;
  const regions = REGION_IDS.map((value) => ({ value, label: geographyT(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  const formRef = useRef<HTMLFormElement>(null);
  const provinceInputRef = useRef<HTMLInputElement>(null);

  const handleRegionChange = (value: string): void => {
    const next = parseLocationFilters(value, province);
    setRegion(next.region ?? '');
    setProvince(next.province ?? '');
    if (regionInputRef.current) regionInputRef.current.value = next.region ?? '';
    if (provinceInputRef.current) provinceInputRef.current.value = next.province ?? '';
    formRef.current?.requestSubmit();
  };

  const handleProvinceChange = (nextProvince: string): void => {
    setProvince(nextProvince);
    if (provinceInputRef.current) {
      provinceInputRef.current.value = nextProvince;
    }
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={action} method="get" className="flex w-full flex-wrap items-end gap-2">
      <input ref={regionInputRef} type="hidden" name="region" defaultValue={region} />
      <div className="min-w-48">
        <SelectMenu
          id={`${inputId}-region`}
          label={t('filters.region')}
          value={region}
          options={regions}
          placeholder={t('filters.allRegions')}
          variant="modal"
          onValueChange={handleRegionChange}
        />
      </div>
      <input
        ref={provinceInputRef}
        id="admin-event-province"
        type="hidden"
        name="province"
        defaultValue={province}
      />
      <div className="min-w-48">
        <SelectMenu
          id="admin-event-province-selector"
          label={t('filters.province')}
          value={province}
          options={provinces.map((value) => ({ value, label: value }))}
          placeholder={t('filters.allProvinces')}
          variant="modal"
          onValueChange={handleProvinceChange}
        />
      </div>
      <div className="relative ml-auto flex w-full max-w-64">
        <label htmlFor={inputId} className="sr-only">
          {t('search.placeholder')}
        </label>
        <Search
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
          strokeWidth={1.5}
        />
        <input
          id={inputId}
          key={initialQuery}
          type="search"
          name="q"
          defaultValue={initialQuery}
          maxLength={200}
          className="h-10 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-normal text-gray-900 outline-none transition-colors focus:border-gray-500 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) =>
          value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />,
        )
        : null}
    </form>
  );
}

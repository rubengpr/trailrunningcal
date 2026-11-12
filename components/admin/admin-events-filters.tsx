'use client';

import { Search, Trash2 } from 'lucide-react';
import { useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { IconButton } from '@/components/ui/icon-button';
import { FilterSelect } from '@/components/filters/filter-select';
import { PROVINCES } from '@/lib/geography/provinces';
import { REGION_IDS } from '@/lib/geography/destinations';
import type { RegionId } from '@/lib/geography/destinations';
import { getFilterProvinces, parseLocationFilters } from '@/lib/geography/filters';

interface AdminEventsFiltersProps {
  action: string;
  inputId: string;
  initialQuery: string;
  initialProvinces?: string[];
  initialRegions?: RegionId[];
  hiddenFields?: Record<string, string | undefined>;
}

export function AdminEventsFilters({
  action,
  inputId,
  initialQuery,
  initialProvinces,
  initialRegions,
  hiddenFields,
}: AdminEventsFiltersProps): React.ReactElement {
  const t = useTranslations('adminEvents');
  const filtersT = useTranslations('filters');
  const [resetKey, setResetKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const geographyT = useTranslations('geography.regions');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic({
    regions: initialRegions ?? [], provinces: initialProvinces ?? [],
  });
  const provinces = getFilterProvinces(selected.regions) ?? PROVINCES;
  const regions = REGION_IDS.map((value) => ({ value, label: geographyT(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  const formRef = useRef<HTMLFormElement>(null);
  const hasActiveFilters = selected.regions.length > 0 || selected.provinces.length > 0
    || Boolean(initialQuery || hiddenFields?.draftId);

  const applySelection = (next: typeof selected, clear = false): void => {
    const params = new URLSearchParams();
    if (formRef.current) {
      new FormData(formRef.current).forEach((value, name) => {
        if (typeof value === 'string' && name !== 'region' && name !== 'province') params.append(name, value);
      });
    }
    if (clear) {
      params.delete('q');
      params.delete('draftId');
    }
    next.regions.forEach((value) => params.append('region', value));
    next.provinces.forEach((value) => params.append('province', value));
    const query = params.toString();
    startTransition(() => {
      setSelected(next);
      router.replace(query ? `${action}?${query}` : action, { scroll: false });
    });
  };

  const clearFilters = (): void => {
    const hasFilters = selected.regions.length > 0 || selected.provinces.length > 0
      || Boolean(initialQuery || searchInputRef.current?.value || hiddenFields?.draftId);
    // Discard open menus' pending selections without applying them first.
    setResetKey((key) => key + 1);
    if (searchInputRef.current) searchInputRef.current.value = '';
    if (hasFilters) applySelection({ regions: [], provinces: [] }, true);
  };

  return (
    <form ref={formRef} action={action} method="get" aria-busy={isPending} className="flex w-full flex-wrap items-end gap-2">
      {selected.regions.map((value) => <input key={value} type="hidden" name="region" value={value} />)}
      {selected.provinces.map((value) => <input key={value} type="hidden" name="province" value={value} />)}
      <FilterSelect
        className="w-64"
        key={`region-${resetKey}`}
        id={`${inputId}-region`}
        label={t('filters.region')}
        value={selected.regions}
        options={regions}
        placeholder={t('filters.allRegions')}
        clearLabel={t('filters.allRegions')}
        searchable
        applyOnClose
        onValueChange={(values) => applySelection(parseLocationFilters(values, selected.provinces))}
      />
      <FilterSelect
        className="w-64"
        key={`province-${resetKey}`}
        id={`${inputId}-province`}
        label={t('filters.province')}
        value={selected.provinces}
        options={provinces.map((value) => ({ value, label: value }))}
        placeholder={t('filters.allProvinces')}
        clearLabel={t('filters.allProvinces')}
        searchable
        applyOnClose
        onValueChange={(values) => applySelection(parseLocationFilters(selected.regions, values))}
      />
      {hasActiveFilters ? <IconButton
        title={filtersT('clearFilters')}
        aria-label={filtersT('clearFilters')}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={clearFilters}
        disabled={isPending}
      >
        <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
      </IconButton> : null}
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
          ref={searchInputRef}
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

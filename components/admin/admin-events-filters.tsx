'use client';

import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SelectMenu } from '@/components/ui/select-menu';
import { PROVINCES } from '@/lib/geography/provinces';

interface AdminEventsFiltersProps {
  action: string;
  inputId: string;
  initialQuery: string;
  initialProvince?: string;
  hiddenFields?: Record<string, string | undefined>;
}

export function AdminEventsFilters({
  action,
  inputId,
  initialQuery,
  initialProvince,
  hiddenFields,
}: AdminEventsFiltersProps): React.ReactElement {
  const t = useTranslations('adminEvents');
  const [province, setProvince] = useState(initialProvince ?? '');
  const formRef = useRef<HTMLFormElement>(null);
  const provinceInputRef = useRef<HTMLInputElement>(null);

  const handleProvinceChange = (nextProvince: string): void => {
    setProvince(nextProvince);
    if (provinceInputRef.current) {
      provinceInputRef.current.value = nextProvince;
    }
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={action} method="get" className="flex w-full flex-wrap justify-between gap-2">
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
          value={province}
          options={PROVINCES.map((value) => ({ value, label: value }))}
          placeholder={t('filters.allProvinces')}
          variant="modal"
          onValueChange={handleProvinceChange}
        />
      </div>
      <div className="relative flex w-full max-w-64">
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

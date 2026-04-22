'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import FilterPill from '@/components/filters/filter-pill';
import type { MultiSelectOptionItem } from '@/components/ui/multi-select-options-menu';

export default function DevPlaygroundIndexPage() {
  const tPlayground = useTranslations('playground');
  const tFilters = useTranslations('filters');
  const tMonths = useTranslations('monthsFull');
  const [selectedMonth, setSelectedMonth] = useState<string[]>(['2']);
  const monthOptions: MultiSelectOptionItem[] = [
    { value: '0', label: tMonths('0') },
    { value: '1', label: tMonths('1') },
    { value: '2', label: tMonths('2') },
    { value: '3', label: tMonths('3') },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">{tPlayground('title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{tPlayground('devOnlyNotice')}</p>
      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">{tPlayground('filtersDemoLink')}</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <FilterPill
            label={tFilters('monthLabel')}
            selectedValues={selectedMonth}
            options={monthOptions}
            onToggleOption={(value) =>
              setSelectedMonth((current) =>
                current.includes(value)
                  ? current.filter((item) => item !== value)
                  : [...current, value],
              )
            }
            onClear={() => setSelectedMonth([])}
            color="white"
            size="sm"
          />
        </div>
      </section>
    </main>
  );
}

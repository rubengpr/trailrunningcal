'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FilterChip } from '@/components/filters/filter-chip';
import { MONTH_INDICES } from '@/lib/constants';

interface MonthFilterProps {
  initialSelectedMonth?: string[];
  onMonthSelect: (months: string[]) => void;
}

export function MonthFilter({
  initialSelectedMonth = [],
  onMonthSelect,
}: MonthFilterProps) {
  const tMonths = useTranslations('months');
  const [selectedMonths, setSelectedMonths] = useState<string[]>(initialSelectedMonth);

  useEffect(() => {
    setSelectedMonths(initialSelectedMonth);
  }, [initialSelectedMonth]);

  const months = MONTH_INDICES.map((index) => ({
    key: index.toString(),
    label: tMonths(index.toString()),
  }));

  const handleMonthClick = (monthKey: string) => {
    const next = selectedMonths.includes(monthKey)
      ? selectedMonths.filter((m) => m !== monthKey)
      : [...selectedMonths, monthKey];
    setSelectedMonths(next);
    onMonthSelect(next);
  };

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
      {months.map((month) => (
        <FilterChip
          key={month.key}
          label={month.label}
          selected={selectedMonths.includes(month.key)}
          onClick={() => handleMonthClick(month.key)}
          size="md"
        />
      ))}
    </div>
  );
}

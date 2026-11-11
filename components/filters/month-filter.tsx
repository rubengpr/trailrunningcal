'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { FilterOptionGroup } from '@/components/filters/filter-option-group';
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
    value: index.toString(),
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
    <FilterOptionGroup
      options={months}
      selectedValues={selectedMonths}
      onToggle={handleMonthClick}
      size="sm"
    />
  );
}

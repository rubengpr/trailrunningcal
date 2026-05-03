'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
        <button
          key={month.key}
          onClick={() => handleMonthClick(month.key)}
          className={`
            px-2 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
            border border-gray-300 hover:border-gray-400 cursor-pointer
            focus:outline-none
            ${
              selectedMonths.includes(month.key)
                ? 'bg-black text-white border-black shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
        >
          {month.label}
        </button>
      ))}
    </div>
  );
}

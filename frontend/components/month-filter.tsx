'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface MonthFilterProps {
  initialSelectedMonth?: string;
  onMonthSelect?: (month: string) => void;
}

const MONTH_KEYS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export default function MonthFilter({
  initialSelectedMonth = '',
  onMonthSelect,
}: MonthFilterProps) {
  const tMonths = useTranslations('months');
  const tFilters = useTranslations('filters');
  const [selectedMonth, setSelectedMonth] = useState<string>(initialSelectedMonth);

  // Sync internal state with prop changes (if parent needs to reset it)
  useEffect(() => {
    setSelectedMonth(initialSelectedMonth);
  }, [initialSelectedMonth]);

  const months = MONTH_KEYS.map((key) => ({
    key,
    label: tMonths(key),
  }));

  const handleMonthClick = (monthKey: string) => {
    const newSelectedMonth = selectedMonth === monthKey ? '' : monthKey;
    setSelectedMonth(newSelectedMonth);
    onMonthSelect?.(newSelectedMonth);
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 sm:gap-2 justify-center"
    >
      {months.map((month) => (
        <button
          key={month.key}
          onClick={() => handleMonthClick(month.key)}
          className={`
            px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
            border-2 border-gray-200 hover:border-indigo-300 hover:cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            ${
              selectedMonth === month.key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
            }
          `}
        >
          {month.label}
        </button>
      ))}
    </div>
  );
}


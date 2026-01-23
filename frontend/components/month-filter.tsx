'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface MonthFilterProps {
  initialSelectedMonth?: string;
  onMonthSelect: (month: string) => void;
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
  const [selectedMonth, setSelectedMonth] =
    useState<string>(initialSelectedMonth);

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
    onMonthSelect(newSelectedMonth);
  };

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
      {months.map((month) => (
        <button
          key={month.key}
          onClick={() => handleMonthClick(month.key)}
          className={`
            px-2 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
            border border-gray-300 hover:border-gray-400 hover:cursor-pointer
            focus:outline-none
            ${
              selectedMonth === month.key
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

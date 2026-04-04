'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import MonthFilter from '@/components/filters/month-filter';
import ProvinceFilter from '@/components/filters/province-filter';
import { Button } from '@/components/ui/button';

interface MobileFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (month: string, province: string) => void;
  onClear: () => void;
  initialMonth: string;
  initialProvince: string;
}

export default function MobileFiltersModal({
  isOpen,
  onClose,
  onApply,
  onClear,
  initialMonth,
  initialProvince,
}: MobileFiltersModalProps) {
  const tFilters = useTranslations('filters');

  const [draftMonth, setDraftMonth] = useState<string>(initialMonth);
  const [draftProvince, setDraftProvince] = useState<string>(initialProvince);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setDraftMonth(initialMonth);
      setDraftProvince(initialProvince);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleApply = () => {
    onApply(draftMonth, draftProvince);
  };

  const handleClearAll = () => {
    setDraftMonth('');
    setDraftProvince('');
    onClear();
  };

  const hasActiveFilters = draftMonth !== '' || draftProvince !== '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <span className="text-base font-semibold text-gray-900">
          {tFilters('filtersLabel')}
        </span>
        <div className="w-8" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 tracking-wide">
            {tFilters('monthLabel')}
          </p>
          <MonthFilter
            initialSelectedMonth={draftMonth}
            onMonthSelect={setDraftMonth}
          />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 tracking-wide">
            {tFilters('provinceLabel')}
          </p>
          <ProvinceFilter
            selectedProvince={draftProvince}
            onProvinceSelect={setDraftProvince}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3">
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center justify-center h-[52px] w-[52px] shrink-0 rounded-xl border border-gray-300 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
        <Button variant="primary" fullWidth onClick={handleApply} className="py-4">
          {tFilters('apply')}
        </Button>
      </div>
    </div>
  );
}

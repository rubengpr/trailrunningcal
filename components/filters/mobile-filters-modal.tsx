'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import MonthFilter from '@/components/filters/month-filter';
import ProvinceFilter from '@/components/filters/province-filter';
import { DISTANCE_GROUPS } from '@/lib/constants';
import { RACE_TYPES, RACE_TYPE_CATEGORY_KEYS } from '@/lib/home-race-filters';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';

interface MobileFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (month: string[], province: string[], distance: string[], raceType: string[]) => void;
  onClear: () => void;
  initialMonth: string[];
  initialProvince: string[];
  initialDistance: string[];
  initialRaceType: string[];
}

export default function MobileFiltersModal({
  isOpen,
  onClose,
  onApply,
  onClear,
  initialMonth,
  initialProvince,
  initialDistance,
  initialRaceType,
}: MobileFiltersModalProps) {
  const tFilters = useTranslations('filters');
  const tDistanceGroups = useTranslations('distanceGroups');
  const tCategory = useTranslations('category');

  const [draftMonth, setDraftMonth] = useState<string[]>(initialMonth);
  const [draftProvince, setDraftProvince] = useState<string[]>(initialProvince);
  const [draftDistance, setDraftDistance] = useState<string[]>(initialDistance);
  const [draftRaceType, setDraftRaceType] = useState<string[]>(initialRaceType);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setDraftMonth(initialMonth);
      setDraftProvince(initialProvince);
      setDraftDistance(initialDistance);
      setDraftRaceType(initialRaceType);
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
    onApply(draftMonth, draftProvince, draftDistance, draftRaceType);
  };

  const handleClearAll = () => {
    setDraftMonth([]);
    setDraftProvince([]);
    setDraftDistance([]);
    setDraftRaceType([]);
    onClear();
  };

  const toggleDraftDistance = (group: string) => {
    setDraftDistance((prev) =>
      prev.includes(group) ? prev.filter((d) => d !== group) : [...prev, group],
    );
  };

  const toggleDraftRaceType = (type: string) => {
    setDraftRaceType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const hasActiveFilters =
    draftMonth.length > 0 ||
    draftProvince.length > 0 ||
    draftDistance.length > 0 ||
    draftRaceType.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white sm:hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" strokeWidth={2} />
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
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 tracking-wide">
            {tFilters('distanceLabel')}
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            {DISTANCE_GROUPS.map((group) => (
              <button
                key={group}
                onClick={() => toggleDraftDistance(group)}
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
                  border border-gray-300 hover:border-gray-400 cursor-pointer focus:outline-none
                  ${draftDistance.includes(group) ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {tDistanceGroups(group)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 tracking-wide">
            {tFilters('raceTypeLabel')}
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            {RACE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleDraftRaceType(type)}
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
                  border border-gray-300 hover:border-gray-400 cursor-pointer focus:outline-none
                  ${draftRaceType.includes(type) ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {tCategory(RACE_TYPE_CATEGORY_KEYS[type])}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3">
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center justify-center h-[52px] w-[52px] shrink-0 rounded-xl border border-gray-300 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
        <Button variant="primary" fullWidth onClick={handleApply} className="py-4">
          {tFilters('apply')}
        </Button>
      </div>
    </div>
  );
}

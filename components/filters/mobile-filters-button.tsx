'use client';

import { useTranslations } from 'next-intl';

interface MobileFiltersButtonProps {
  filterCount: number;
  onClick: () => void;
  color?: 'white' | 'black';
}

export default function MobileFiltersButton({ filterCount, onClick, color = 'white' }: MobileFiltersButtonProps) {
  const tFilters = useTranslations('filters');

  return (
    <section className="sm:hidden sticky top-[4.5rem] z-20 w-full min-w-0 px-3 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full">
        <button
          onClick={onClick}
          className={`w-full flex items-center justify-center py-2.5 text-sm font-medium rounded-xl transition-colors ${color === 'black' ? 'bg-black text-white border border-black hover:bg-neutral-900' : 'bg-white text-gray-900 border border-gray-400 hover:bg-gray-50'}`}
        >
          {filterCount > 0 ? (
            <>
              {tFilters('filtersLabel')}
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-gray-900 rounded-full">
                {filterCount}
              </span>
            </>
          ) : (
            tFilters('filterRacesButton')
          )}
        </button>
      </div>
    </section>
  );
}

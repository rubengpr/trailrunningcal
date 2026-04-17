'use client';

import { useState, useRef, useEffect } from 'react';

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder: string;
  options: FilterSelectOption[];
  variant?: 'select' | 'pill';
}

export function FilterSelect({ value, onValueChange, placeholder, options, variant = 'select' }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function handleToggle(optionValue: string) {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(next);
  }

  function handleClear() {
    onValueChange([]);
    setOpen(false);
  }

  const isBadge = variant === 'pill';
  const isActive = value.length > 0;

  const firstLabel = isActive ? options.find((o) => o.value === value[0])?.label ?? null : null;
  const selectLabel = !isActive ? null : value.length === 1 ? firstLabel : `${firstLabel} +${value.length - 1}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          isBadge
            ? `inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm cursor-pointer transition-all duration-150 focus:outline-none ${
                isActive
                  ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800 hover:border-gray-800'
                  : open
                    ? 'border-gray-400 bg-white text-gray-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }`
            : `flex items-center justify-between gap-2 min-w-40 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 ${
                open ? 'border-gray-400 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              } ${selectLabel ? 'text-gray-900' : 'text-gray-400'}`
        }
      >
        {isBadge ? (
          <>
            <span className="font-medium">{placeholder}</span>
            {isActive && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-gray-900 text-[10px] font-semibold leading-none shrink-0">
                {value.length}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="truncate">{selectLabel ?? placeholder}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className={`absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-filter-select-in ${isBadge ? 'min-w-40' : ''}`}>
          <div className="p-1">
            <button
              type="button"
              onClick={handleClear}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors duration-100 cursor-pointer ${
                value.length === 0 ? 'text-gray-900 font-medium' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className="w-3.5 shrink-0">
                {value.length === 0 && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              {placeholder}
            </button>

            {options.map((option) => {
              const selected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors duration-100 cursor-pointer ${
                    selected ? 'text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${selected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                    {selected && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBadge(props: Omit<FilterSelectProps, 'variant'>) {
  return <FilterSelect {...props} variant="pill" />;
}

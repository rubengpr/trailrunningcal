'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder: string;
  options: FilterSelectOption[];
  variant?: 'control' | 'pill';
  color?: 'white' | 'black';
  size?: 'sm' | 'md';
}

export function FilterSelect({ value, onValueChange, placeholder, options, variant = 'control', color = 'white', size = 'md' }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; minWidth: number }>({ top: 0, left: 0, minWidth: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideContainer && !insideDropdown) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
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

  function handleButtonClick() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const minWidth = Math.max(rect.width, 160);
      const wouldOverflowRight = rect.left + minWidth > window.innerWidth;
      const left = wouldOverflowRight
        ? rect.right + window.scrollX - minWidth
        : rect.left + window.scrollX;
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 4,
        left,
        minWidth,
      });
    }
    setOpen((prev) => !prev);
  }

  const isPill = variant === 'pill';
  const isActive = value.length > 0;
  const firstLabel = isActive ? options.find((o) => o.value === value[0])?.label ?? null : null;
  const selectLabel = !isActive ? null : value.length === 1 ? firstLabel : `${firstLabel} +${value.length - 1}`;

  const pillCn = [
    'inline-flex items-center gap-1.5 rounded-full border cursor-pointer transition-all duration-150 focus:outline-none',
    size === 'sm' ? 'px-4 py-2 text-xs' : 'px-4 py-1.5 text-sm',
    color === 'black'
      ? 'bg-black text-white border-black hover:bg-neutral-900 hover:border-neutral-900'
      : isActive
        ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800 hover:border-gray-800'
        : open
          ? 'border-gray-400 bg-white text-gray-700'
          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-800',
  ].join(' ');

  const controlCn = [
    'flex items-center justify-between gap-2 min-w-40 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400',
    color === 'black' ? 'font-semibold' : '',
    color === 'black'
      ? 'bg-black text-white border-black hover:bg-neutral-900 hover:border-neutral-900'
      : open
        ? 'border-gray-400 bg-white shadow-sm'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
    color === 'black' ? '' : selectLabel ? 'text-gray-900' : 'text-gray-400',
  ].join(' ');

  const dropdown = open && (
    <div
      ref={dropdownRef}
      style={{ position: 'absolute', top: dropdownStyle.top, left: dropdownStyle.left, minWidth: dropdownStyle.minWidth, zIndex: 9999 }}
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-filter-select-in"
    >
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
  );

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className={isPill ? pillCn : controlCn}
      >
        {isPill ? (
          <>
            <span className="font-medium">{placeholder}</span>
            {isActive && (
              <span className={`inline-flex items-center justify-center rounded-full bg-white text-gray-900 font-semibold leading-none shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5 text-[9px]' : 'w-4 h-4 text-[10px]'}`}>
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
              className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${color === 'black' ? 'text-gray-300' : 'text-gray-400'}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}

export function FilterBadge(props: Omit<FilterSelectProps, 'variant'>) {
  return <FilterSelect {...props} variant="pill" />;
}

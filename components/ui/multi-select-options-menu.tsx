'use client';

import type { CSSProperties, RefObject } from 'react';
import { Check } from 'lucide-react';
import MultiSelectOption from '@/components/ui/multi-select-option';

export interface MultiSelectOptionItem {
  value: string;
  label: string;
}

interface MultiSelectOptionsMenuProps {
  options: MultiSelectOptionItem[];
  selectedValues: string[];
  placeholder: string;
  onToggleOption: (value: string) => void;
  onClear: () => void;
  dropdownRef?: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
}

export default function MultiSelectOptionsMenu({
  options,
  selectedValues,
  placeholder,
  onToggleOption,
  onClear,
  dropdownRef,
  style,
}: MultiSelectOptionsMenuProps) {
  return (
    <div
      ref={dropdownRef}
      style={style}
      className="z-[9999] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-filter-select-in"
    >
      <div className="p-1">
        <button
          type="button"
          onClick={onClear}
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors duration-100 cursor-pointer ${
            selectedValues.length === 0 ? 'text-gray-900 font-medium' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <span className="w-3.5 shrink-0">
            {selectedValues.length === 0 && (
              <Check size={14} strokeWidth={2.5} />
            )}
          </span>
          {placeholder}
        </button>

        {options.map((option) => {
          const selected = selectedValues.includes(option.value);
          return (
            <MultiSelectOption
              key={option.value}
              label={option.label}
              selected={selected}
              onClick={() => onToggleOption(option.value)}
            />
          );
        })}
      </div>
    </div>
  );
}

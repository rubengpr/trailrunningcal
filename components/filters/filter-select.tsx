'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FilterOptionsMenu } from '@/components/filters/filter-options-menu';
import { useFilterOptionsMenu } from '@/hooks/use-filter-options-menu';
import type { MultiSelectOptionItem } from '@/components/ui/multi-select-options-menu';

export type FilterSelectOption = MultiSelectOptionItem;

interface FilterSelectProps {
  className?: string;
  id?: string;
  label?: string;
  clearLabel?: string;
  applyOnClose?: boolean;
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder: string;
  options: FilterSelectOption[];
  color?: 'white' | 'black';
  searchable?: boolean;
}

export function FilterSelect({ value, onValueChange, placeholder, options, color = 'white', searchable = false, id, label, clearLabel, applyOnClose = false, className = '' }: FilterSelectProps) {
  const [draftValue, setDraftValue] = useState(value);
  const menu = useFilterOptionsMenu(() => {
    if (applyOnClose && (draftValue.length !== value.length || draftValue.some((item) => !value.includes(item)))) {
      onValueChange(draftValue);
    }
  });
  const { open, containerRef, triggerRef, toggleOpen } = menu;

  const selectedValues = applyOnClose && open ? draftValue : value;

  function handleValuesChange(next: string[]) {
    if (applyOnClose) setDraftValue(next);
    else onValueChange(next);
  }

  function handleToggle(optionValue: string) {
    handleValuesChange(selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue]);
  }

  const isActive = selectedValues.length > 0;
  const firstLabel = isActive ? options.find((o) => o.value === selectedValues[0])?.label ?? null : null;
  const selectLabel = !isActive ? null : selectedValues.length === 1 ? firstLabel : `${firstLabel} +${selectedValues.length - 1}`;

  const controlCn = [
    'flex items-center justify-between gap-2 min-w-40 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400',
    color === 'black' ? 'font-semibold' : '',
    color === 'black'
      ? 'bg-black text-white border-black hover:bg-neutral-900 hover:border-neutral-900'
      : open
        ? 'border-gray-400 bg-white shadow-sm'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
    color === 'black' ? '' : selectLabel ? 'text-gray-900' : 'text-gray-400',
    className,
  ].join(' ');

  return (
    <div ref={containerRef} className="relative shrink-0">
      {label ? <label htmlFor={id} className="mb-2 block text-sm font-medium leading-none text-gray-900">{label}</label> : null}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) setDraftValue(value);
          toggleOpen();
        }}
        className={controlCn}
      >
        <>
          <span className="truncate">{selectLabel ?? placeholder}</span>
          <ChevronDown
            size={14}
            className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${color === 'black' ? 'text-gray-300' : 'text-gray-400'}`}
          />
        </>
      </button>

      <FilterOptionsMenu
        menu={menu}
        clearLabel={clearLabel}
        options={options}
        selectedValues={selectedValues}
        searchable={searchable}
        onToggleOption={handleToggle}
        onValuesChange={handleValuesChange}
      />
    </div>
  );
}

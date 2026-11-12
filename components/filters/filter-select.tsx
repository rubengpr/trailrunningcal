'use client';

import { createPortal } from 'react-dom';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMultiSelectMenu } from '@/hooks/use-multi-select-menu';
import {
  MULTI_SELECT_MENU_MAX_HEIGHT,
  MultiSelectOptionsMenu,
  type MultiSelectOptionItem,
} from '@/components/ui/multi-select-options-menu';

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
  const { open, containerRef, triggerRef, dropdownRef, dropdownStyle, toggleOpen } = useMultiSelectMenu({
    usePortalPosition: true,
    minWidth: 160,
    offset: 4,
    preferredMenuHeight: MULTI_SELECT_MENU_MAX_HEIGHT,
    placement: 'bottom',
    onClose: () => {
      if (applyOnClose && (draftValue.length !== value.length || draftValue.some((item) => !value.includes(item)))) {
        onValueChange(draftValue);
      }
    },
  });

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

  const dropdown = open && (
    <MultiSelectOptionsMenu
      clearLabel={clearLabel}
      options={options}
      selectedValues={selectedValues}
      searchable={searchable}
      onToggleOption={handleToggle}
      onValuesChange={handleValuesChange}
      dropdownRef={dropdownRef}
      style={{ position: 'absolute', top: dropdownStyle.top, left: dropdownStyle.left, minWidth: dropdownStyle.minWidth, maxHeight: dropdownStyle.maxHeight, zIndex: 9999 }}
    />
  );

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

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}

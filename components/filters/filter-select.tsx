'use client';

import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useMultiSelectMenuState } from '@/hooks/use-multi-select-menu-state';
import MultiSelectOptionsMenu from '@/components/ui/multi-select-options-menu';

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder: string;
  options: FilterSelectOption[];
  color?: 'white' | 'black';
}

export function FilterSelect({ value, onValueChange, placeholder, options, color = 'white' }: FilterSelectProps) {
  const { open, containerRef, triggerRef, dropdownRef, dropdownStyle, toggleOpen, closeMenu } = useMultiSelectMenuState({
    usePortalPosition: true,
    minWidth: 160,
    offset: 4,
  });

  function handleToggle(optionValue: string) {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(next);
  }

  function handleClear() {
    onValueChange([]);
    closeMenu();
  }

  const isActive = value.length > 0;
  const firstLabel = isActive ? options.find((o) => o.value === value[0])?.label ?? null : null;
  const selectLabel = !isActive ? null : value.length === 1 ? firstLabel : `${firstLabel} +${value.length - 1}`;

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
    <MultiSelectOptionsMenu
      options={options}
      selectedValues={value}
      placeholder={placeholder}
      onToggleOption={handleToggle}
      onClear={handleClear}
      dropdownRef={dropdownRef}
      style={{ position: 'absolute', top: dropdownStyle.top, left: dropdownStyle.left, minWidth: dropdownStyle.minWidth, zIndex: 9999 }}
    />
  );

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
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

'use client';

import MultiSelectOptionsMenu, { type MultiSelectOptionItem } from '@/components/ui/multi-select-options-menu';
import { useMultiSelectMenuState } from '@/hooks/use-multi-select-menu-state';

interface FilterPillProps {
  label: string;
  selectedValues: string[];
  options: MultiSelectOptionItem[];
  onToggleOption: (value: string) => void;
  onClear: () => void;
  color: 'white' | 'black';
  size: 'sm' | 'md';
}

export default function FilterPill({
  label,
  selectedValues,
  options,
  onToggleOption,
  onClear,
  color,
  size,
}: FilterPillProps) {
  const { open, containerRef, triggerRef, dropdownRef, toggleOpen, closeMenu } = useMultiSelectMenuState();
  const isSelected = selectedValues.length > 0;

  const pillClasses = [
    'inline-flex items-center gap-1.5 rounded-full border cursor-pointer transition-all duration-150 focus:outline-none',
    size === 'sm' ? 'px-4 py-2 text-xs' : 'px-4 py-1.5 text-sm',
    color === 'black'
      ? 'bg-black text-white border-black hover:bg-neutral-900 hover:border-neutral-900'
      : isSelected
        ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800 hover:border-gray-800'
        : open
          ? 'border-gray-400 bg-white text-gray-700'
          : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-800',
  ].join(' ');

  return (
    <div ref={containerRef} className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        onKeyDown={(event): void => {
          if (event.key !== 'Backspace' && event.key !== 'Delete') return;
          event.preventDefault();
          onClear();
        }}
        aria-label={isSelected ? `${label}, ${selectedValues.length} selected` : label}
        className={pillClasses}
      >
        <span className="font-medium">{label}</span>
        {isSelected && (
          <span className={`inline-flex items-center justify-center rounded-full bg-white text-gray-900 font-semibold leading-none shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5 text-[9px]' : 'w-4 h-4 text-[10px]'}`}>
            {selectedValues.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[160px]">
          <MultiSelectOptionsMenu
            options={options}
            selectedValues={selectedValues}
            placeholder={label}
            onToggleOption={onToggleOption}
            onClear={() => {
              onClear();
              closeMenu();
            }}
            dropdownRef={dropdownRef}
          />
        </div>
      )}
    </div>
  );
}

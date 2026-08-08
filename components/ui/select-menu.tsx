'use client';

import { createPortal } from 'react-dom';
import { useEffect, useId } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useMultiSelectMenu } from '@/hooks/use-multi-select-menu';

export interface SelectMenuOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  id?: string;
  label?: React.ReactNode;
  value: string;
  options: readonly SelectMenuOption[];
  placeholder: string;
  disabled?: boolean;
  variant?: 'form' | 'modal';
  onValueChange: (value: string) => void;
}

const triggerClasses = {
  form: 'h-10 text-xs font-mono',
  modal: 'h-[42px] text-sm',
};

export function SelectMenu({
  id: externalId,
  label,
  value,
  options,
  placeholder,
  disabled = false,
  variant = 'form',
  onValueChange,
}: SelectMenuProps): React.ReactElement {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const menuId = `${id}-options`;
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const preferredMenuHeight = Math.min(288, (options.length + 1) * 40 + 8);
  const {
    open,
    containerRef,
    triggerRef,
    dropdownRef,
    dropdownStyle,
    openMenu,
    toggleOpen,
    closeMenu,
  } = useMultiSelectMenu({
    usePortalPosition: true,
    minWidth: 240,
    offset: 6,
    preferredMenuHeight,
  });

  useEffect(() => {
    if (!open) return;

    const optionElements = Array.from(
      dropdownRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    const selectedOption = optionElements.find(
      (option) => option.dataset.value === value,
    );
    const firstOption = optionElements[0];
    (selectedOption ?? firstOption)?.focus();
  }, [dropdownRef, open, value]);

  const selectValue = (nextValue: string): void => {
    onValueChange(nextValue);
    closeMenu();
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    openMenu();
  };

  const handleMenuKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      triggerRef.current?.focus();
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const optionElements = Array.from(
      dropdownRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    if (optionElements.length === 0) return;

    const currentIndex = optionElements.indexOf(document.activeElement as HTMLElement);
    let nextIndex = currentIndex;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = optionElements.length - 1;
    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(currentIndex + 1, optionElements.length - 1);
    }
    if (event.key === 'ArrowUp') {
      nextIndex = Math.max(currentIndex - 1, 0);
    }
    optionElements[nextIndex]?.focus();
  };

  const menu = open && (
    <div
      ref={dropdownRef}
      id={menuId}
      role="listbox"
      onKeyDown={handleMenuKeyDown}
      className="z-9999 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg animate-filter-select-in"
      style={{
        position: 'absolute',
        top: dropdownStyle.top,
        left: dropdownStyle.left,
        minWidth: dropdownStyle.minWidth,
        maxHeight: dropdownStyle.maxHeight,
      }}
    >
      {[{ value: '', label: placeholder }, ...options].map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            data-value={option.value}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectValue(option.value)}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-100 ${selected
                ? 'bg-gray-100 font-medium text-gray-950'
                : option.value
                  ? 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
          >
            <span className="w-4 shrink-0">
              {selected ? <Check size={15} strokeWidth={2.5} /> : null}
            </span>
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`grid w-full gap-2 ${label ? '' : 'gap-0'}`}
    >
      {label ? (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none text-gray-900"
        >
          {label}
        </label>
      ) : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-gray-900 transition-colors hover:border-gray-300 focus-visible:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 disabled:cursor-not-allowed disabled:opacity-50 ${triggerClasses[variant]}`}
      >
        <span className={selectedLabel ? 'truncate' : 'truncate text-gray-400'}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`ml-3 shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  );
}

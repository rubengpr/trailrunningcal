'use client';

import { Check, Minus } from 'lucide-react';

interface MultiSelectOptionProps {
  label: string;
  selected: boolean;
  indeterminate?: boolean;
  variant?: 'option' | 'group';
  onClick: () => void;
}

export function MultiSelectOption({
  label,
  selected,
  indeterminate = false,
  variant = 'option',
  onClick,
}: MultiSelectOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : selected}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors duration-100 cursor-pointer ${
        variant === 'group'
          ? 'text-xs font-semibold uppercase tracking-wide text-gray-900 hover:bg-gray-50'
          : selected ? 'text-sm text-gray-900 font-medium' : 'text-sm text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className={`w-3.5 h-3.5 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${selected || indeterminate ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
        {indeterminate ? (
          <Minus size={9} strokeWidth={3} stroke="white" />
        ) : selected ? (
          <Check size={9} strokeWidth={3} stroke="white" />
        ) : null}
      </span>
      {label}
    </button>
  );
}

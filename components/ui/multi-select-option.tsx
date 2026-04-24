'use client';

import { Check } from 'lucide-react';

interface MultiSelectOptionProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function MultiSelectOption({
  label,
  selected,
  onClick,
}: MultiSelectOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors duration-100 cursor-pointer ${
        selected ? 'text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className={`w-3.5 h-3.5 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${selected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
        {selected && (
          <Check size={9} strokeWidth={3} stroke="white" />
        )}
      </span>
      {label}
    </button>
  );
}

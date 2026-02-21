'use client';

import { useState, useEffect } from 'react';

export interface ToggleFilterOption {
  key: string;
  label: string;
}

interface ToggleFilterProps {
  options: ToggleFilterOption[];
  onSelect: (selectedKey: string) => void;
  initialSelected?: string;
  className?: string;
}

export function ToggleFilter({
  options,
  onSelect,
  initialSelected = '',
  className = '',
}: ToggleFilterProps) {
  const [selected, setSelected] = useState<string>(initialSelected);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  const handleClick = (key: string) => {
    const newSelected = selected === key ? '' : key;
    setSelected(newSelected);
    onSelect(newSelected);
  };

  return (
    <div className={`flex flex-wrap gap-1.5 sm:gap-2 justify-center ${className}`.trim()}>
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => handleClick(option.key)}
          className={`
            px-2 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
            border border-gray-300 hover:border-gray-400 hover:cursor-pointer
            focus:outline-none
            ${
              selected === option.key
                ? 'bg-black text-white border-black shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

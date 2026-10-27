'use client';

import { useState, useEffect } from 'react';
import { FilterChip } from '@/components/filters/filter-chip';

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
        <FilterChip
          key={option.key}
          label={option.label}
          selected={selected === option.key}
          onClick={() => handleClick(option.key)}
          size="md"
        />
      ))}
    </div>
  );
}

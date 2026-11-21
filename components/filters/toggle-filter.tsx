'use client';

import { useState, useEffect } from 'react';
import { FilterChipGroup } from '@/components/filters/filter-chip-group';

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
    <FilterChipGroup
      options={options}
      selectedKeys={[selected]}
      onToggle={handleClick}
      size="md"
      className={className}
    />
  );
}

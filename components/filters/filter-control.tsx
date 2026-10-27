'use client';

import { FilterPill } from '@/components/filters/filter-pill';
import { FilterSelect } from '@/components/filters/filter-select';
import type { MultiSelectOptionItem } from '@/components/ui/multi-select-options-menu';

interface FilterControlProps {
  variant: 'control' | 'pill';
  label: string;
  options: MultiSelectOptionItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  color: 'white' | 'black';
  size: 'sm' | 'md';
}

export function FilterControl({
  variant,
  label,
  options,
  selectedValues,
  onChange,
  searchable = false,
  color,
  size,
}: FilterControlProps) {
  if (variant === 'pill') {
    return (
      <FilterPill
        label={label}
        selectedValues={selectedValues}
        options={options}
        searchable={searchable}
        onToggleOption={(value) => onChange(
          selectedValues.includes(value)
            ? selectedValues.filter((item) => item !== value)
            : [...selectedValues, value],
        )}
        onValuesChange={onChange}
        onClear={() => onChange([])}
        color={color}
        size={size}
      />
    );
  }

  return (
    <FilterSelect
      value={selectedValues}
      onValueChange={onChange}
      placeholder={label}
      options={options}
      searchable={searchable}
      color={color}
    />
  );
}

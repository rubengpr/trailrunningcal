import { FilterChip } from '@/components/filters/filter-chip';

interface FilterChipGroupProps {
  options: { key: string; label: string }[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function FilterChipGroup({
  options,
  selectedKeys,
  onToggle,
  size,
  className = '',
}: FilterChipGroupProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 sm:gap-2 justify-center ${className}`.trim()}>
      {options.map(({ key, label }) => (
        <FilterChip
          key={key}
          label={label}
          selected={selectedKeys.includes(key)}
          onClick={() => onToggle(key)}
          size={size}
        />
      ))}
    </div>
  );
}

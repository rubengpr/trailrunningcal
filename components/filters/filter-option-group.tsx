'use client';

interface FilterOptionGroupProps {
  options: { value: string; label: string }[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  align?: 'start' | 'center';
  size?: 'sm' | 'md';
}

export function FilterOptionGroup({
  options,
  selectedValues,
  onToggle,
  align = 'center',
  size = 'md',
}: FilterOptionGroupProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 sm:gap-2 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onToggle(value)}
          className={`rounded-md text-xs sm:text-sm font-medium transition-all duration-200 border border-gray-300 hover:border-gray-400 cursor-pointer focus:outline-none ${size === 'sm' ? 'px-2 py-1.5' : 'px-2 sm:px-2.5 py-1 sm:py-1.5'} ${selectedValues.includes(value)
            ? 'bg-black text-white border-black shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

'use client';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}

export function FilterChip({
  label,
  selected,
  onClick,
  size = 'sm',
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md text-xs sm:text-sm font-medium transition-all duration-200 border border-gray-300 hover:border-gray-400 cursor-pointer focus:outline-none ${
        size === 'md' ? 'px-2 py-1.5' : 'px-2 sm:px-2.5 py-1 sm:py-1.5'
      } ${
        selected
          ? 'bg-black text-white border-black shadow-md'
          : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}

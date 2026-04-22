'use client';

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
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

import { Search } from 'lucide-react';
import type { Ref } from 'react';

interface AdminSearchInputProps {
  id: string;
  initialQuery: string;
  label: string;
  inputRef?: Ref<HTMLInputElement>;
}

export function AdminSearchInput({
  id,
  initialQuery,
  label,
  inputRef,
}: AdminSearchInputProps): React.ReactElement {
  return (
    <div className="relative ml-auto flex w-full max-w-64">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
        strokeWidth={1.5}
      />
      <input
        id={id}
        ref={inputRef}
        key={initialQuery}
        type="search"
        name="q"
        defaultValue={initialQuery}
        maxLength={200}
        className="h-10 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-normal text-gray-900 outline-none transition-colors focus:border-gray-500 [&::-webkit-search-cancel-button]:appearance-none"
      />
    </div>
  );
}

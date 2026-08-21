import { Search } from 'lucide-react';

interface AdminListSearchProps {
  action: string;
  inputId: string;
  initialQuery: string;
  label: string;
  hiddenFields?: Record<string, string | undefined>;
}

export function AdminListSearch({
  action,
  inputId,
  initialQuery,
  label,
  hiddenFields,
}: AdminListSearchProps): React.ReactElement {
  return (
    <form action={action} method="get" className="relative ml-auto flex w-full max-w-64">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
        strokeWidth={1.5}
      />
      <input
        id={inputId}
        key={initialQuery}
        type="search"
        name="q"
        defaultValue={initialQuery}
        maxLength={200}
        className="h-10 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-normal text-gray-900 outline-none transition-colors focus:border-gray-500 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) =>
          value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />,
        )
        : null}
    </form>
  );
}

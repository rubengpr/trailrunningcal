import { AdminSearchInput } from '@/components/admin/admin-search-input';

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
    <form action={action} method="get" className="ml-auto flex w-full max-w-64">
      <AdminSearchInput id={inputId} initialQuery={initialQuery} label={label} />
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) =>
          value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />,
        )
        : null}
    </form>
  );
}

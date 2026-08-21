interface AdminListEmptyStateProps {
  message: string;
}

export function AdminListEmptyState({ message }: AdminListEmptyStateProps): React.ReactElement {
  return (
    <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
      {message}
    </p>
  );
}

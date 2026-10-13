import { WholeWord } from 'lucide-react';

export function CharacterCountBadge({ count, label, className = '' }: {
  count: number; label: string; className?: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full border border-gray-200/60 bg-gray-50 px-2 text-[11px] font-medium tabular-nums text-gray-600 ${className}`}
    >
      <WholeWord className="size-3" strokeWidth={2} aria-hidden="true" />
      {count}
    </span>
  );
}

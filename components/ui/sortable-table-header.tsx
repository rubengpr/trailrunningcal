import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { TableCell } from '@/components/ui/table';

interface SortableTableHeaderProps {
  label: string;
  href: string;
  direction: 'asc' | 'desc' | null;
  align?: 'left' | 'right';
}

export function SortableTableHeader({
  label,
  href,
  direction,
  align = 'left',
}: SortableTableHeaderProps) {
  return (
    <TableCell header align={align}>
      <Link href={href} className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-gray-800">
        {label}
        {direction === null ? (
          <ChevronsUpDown className="size-3.5 text-gray-300" strokeWidth={1.5} />
        ) : direction === 'asc' ? (
          <ChevronUp className="size-3.5" strokeWidth={2} />
        ) : (
          <ChevronDown className="size-3.5" strokeWidth={2} />
        )}
      </Link>
    </TableCell>
  );
}

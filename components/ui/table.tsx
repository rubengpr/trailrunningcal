import { HTMLAttributes, ReactNode, TdHTMLAttributes } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div
      className={`w-full bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden ${className}`.trim()}
    >
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return (
    <thead>
      <tr className={`bg-gray-100 border-b border-gray-200 ${className}`.trim()}>{children}</tr>
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return (
    <tbody className={`bg-white divide-y divide-gray-50 ${className}`.trim()}>
      {children}
    </tbody>
  );
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  className?: string;
  clickable?: boolean;
}

export function TableRow({
  children,
  className = '',
  clickable = false,
  ...props
}: TableRowProps) {
  const clickableClasses = clickable
    ? 'hover:bg-gray-100 transition-colors duration-150 cursor-pointer group'
    : '';
  return (
    <tr className={`${clickableClasses} ${className}`.trim()} {...props}>
      {children}
    </tr>
  );
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  className?: string;
  header?: boolean;
  align?: 'left' | 'right';
  sticky?: boolean;
  muted?: boolean;
}

export function TableCell({
  children,
  className = '',
  header = false,
  align = 'left',
  sticky = false,
  muted = false,
  ...props
}: TableCellProps) {
  const alignClass = align === 'right' ? 'text-right' : 'text-left';
  const stickyClass = sticky ? 'sticky left-0 bg-white z-10' : '';

  if (header) {
    const headerColor = muted ? 'text-gray-300' : 'text-gray-500';
    const headerStickyClass = sticky ? 'sticky left-0 bg-gray-100 z-10' : '';
    const headerClasses =
      `px-6 py-3 text-xs font-medium uppercase tracking-wider ${headerColor} ${alignClass} ${headerStickyClass} ${className}`.trim();
    return (
      <th className={headerClasses} {...props}>
        {children}
      </th>
    );
  }

  const cellAlign = align === 'right' ? 'text-right' : '';
  const cellClasses = `px-6 py-2.5 ${cellAlign} ${stickyClass} ${className}`.trim();
  return (
    <td className={cellClasses} {...props}>
      {children}
    </td>
  );
}

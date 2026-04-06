import type { ReactNode, SelectHTMLAttributes } from 'react';

interface FilterSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  children: ReactNode;
}

export function FilterSelect({ children, ...props }: FilterSelectProps) {
  return (
    <select
      className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-black min-w-40"
      {...props}
    >
      {children}
    </select>
  );
}

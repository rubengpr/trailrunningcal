'use client';

import type { ReactNode, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface FormSelectProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'children' | 'className'
  > {
  id: string;
  label: string | ReactNode;
  error?: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function FormSelect({
  id,
  label,
  error,
  helperText,
  children,
  className = '',
  containerClassName,
  disabled,
  ...props
}: FormSelectProps) {
  return (
    <div className={`grid gap-2 w-full ${containerClassName ?? ''}`}>
      <label htmlFor={id} className="text-sm font-medium leading-none text-gray-900">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          className={`flex h-10 w-full cursor-pointer appearance-none rounded-md border border-gray-200 bg-white py-2 pl-3 pr-10 text-xs font-mono text-gray-900 transition-colors focus-visible:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 disabled:cursor-not-allowed disabled:opacity-50${className ? ` ${className}` : ''}`}
          {...props}
        >
          {children}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          aria-hidden
        >
          <ChevronDown size={16} />
        </span>
      </div>
      {(error || helperText) && (
        <div>
          {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
          {helperText && !error && (
            <p className="text-xs text-gray-500 ml-1">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
}

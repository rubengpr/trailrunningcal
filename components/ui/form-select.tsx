'use client';

import type { ReactNode, SelectHTMLAttributes } from 'react';

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
}

export function FormSelect({
  id,
  label,
  error,
  helperText,
  children,
  className = '',
  disabled,
  ...props
}: FormSelectProps) {
  return (
    <div className="grid gap-2 w-full">
      <label htmlFor={id} className="text-sm font-medium leading-none text-gray-900">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          className={`flex h-10 w-full cursor-pointer appearance-none rounded-md border border-gray-200 bg-white py-2 pl-3 pr-10 text-xs font-mono text-gray-900 shadow-sm transition-colors focus-visible:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 disabled:cursor-not-allowed disabled:opacity-50${className ? ` ${className}` : ''}`}
          {...props}
        >
          {children}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </span>
      </div>
      <div className="h-5">
        {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-gray-500 ml-1">{helperText}</p>
        )}
      </div>
    </div>
  );
}

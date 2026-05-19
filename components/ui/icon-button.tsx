import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  className?: string;
}

export function IconButton({ className = '', children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

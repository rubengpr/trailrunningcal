'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string | React.ReactNode;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
  labelRightContent?: React.ReactNode;
  type?: React.InputHTMLAttributes<HTMLInputElement>['type'];
}

export function FormInput({
  id,
  label,
  error,
  helperText,
  showPasswordToggle = false,
  labelRightContent,
  type = 'text',
  className = '',
  ...props
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="grid gap-2 w-full">
      {labelRightContent ? (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-sm font-medium leading-none"
          >
            {label}
          </label>
          {labelRightContent}
        </div>
      ) : (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          className={`flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50${showPasswordToggle ? ' pr-10' : ''}${className ? ` ${className}` : ''}`}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showPassword ? (
              <Eye size={16} />
            ) : (
              <EyeOff size={16} />
            )}
          </button>
        )}
      </div>
      <div className="h-5">
        {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-gray-500 ml-1">{helperText}</p>}
      </div>
    </div>
  );
}

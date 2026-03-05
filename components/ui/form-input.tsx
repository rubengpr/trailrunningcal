'use client';

import { useState } from 'react';

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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
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

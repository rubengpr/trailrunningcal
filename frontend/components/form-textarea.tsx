'use client';

interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string;
  label: string | React.ReactNode;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  labelRightContent?: React.ReactNode;
}

export function FormTextarea({
  id,
  label,
  error,
  helperText,
  maxLength,
  showCharacterCount = false,
  labelRightContent,
  className = '',
  value = '',
  ...props
}: FormTextareaProps) {
  const characterCount = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxLength && characterCount > maxLength * 0.9;
  const isOverLimit = maxLength && characterCount > maxLength;

  return (
    <div className="grid gap-2 w-full">
      {labelRightContent || (showCharacterCount && maxLength) ? (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-sm font-medium leading-none"
          >
            {label}
          </label>
          {labelRightContent || (
            showCharacterCount && maxLength && (
              <span
                className={`text-xs ${isOverLimit
                  ? 'text-red-500'
                  : isNearLimit
                    ? 'text-orange-500'
                    : 'text-gray-500'
                  }`}
              >
                {characterCount}/{maxLength}
              </span>
            )
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        maxLength={maxLength}
        className={`flex min-h-[250px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y${className ? ` ${className}` : ''}`}
        value={value}
        {...props}
      />
    </div>
  );
}

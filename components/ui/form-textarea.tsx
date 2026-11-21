'use client';

import { FormFieldLabel } from '@/components/ui/form-field-label';

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
  maxLength,
  showCharacterCount = false,
  labelRightContent,
  className = '',
  value = '',
  ...props
}: FormTextareaProps) {
  const characterCount = typeof value === 'string' ? value.length : 0;
  const countColor = maxLength && characterCount > maxLength
    ? 'text-red-500'
    : maxLength && characterCount > maxLength * 0.9
      ? 'text-orange-500'
      : 'text-gray-500';
  const count = showCharacterCount && maxLength ? (
    <span className={`text-xs ${countColor}`}>{characterCount}/{maxLength}</span>
  ) : null;

  return (
    <div className="grid gap-2 w-full">
      <FormFieldLabel
        inputId={id}
        label={label}
        rightContent={labelRightContent || count}
      />
      <textarea
        id={id}
        maxLength={maxLength}
        className={`flex min-h-[250px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y${className ? ` ${className}` : ''}`}
        value={value}
        {...props}
      />
      {props.error && (
        <p className="text-sm text-red-500">{props.error}</p>
      )}
    </div>
  );
}

import type { ReactNode } from 'react';

interface FormFieldLabelProps {
  inputId: string;
  label?: ReactNode;
  rightContent?: ReactNode;
}

export function FormFieldLabel({ inputId, label, rightContent }: FormFieldLabelProps) {
  const fieldLabel = (
    <label htmlFor={inputId} className="text-sm font-medium leading-none">
      {label}
    </label>
  );

  return rightContent ? (
    <div className="flex items-center justify-between">
      {fieldLabel}
      {rightContent}
    </div>
  ) : fieldLabel;
}

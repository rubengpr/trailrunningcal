'use client';

import { FormInput } from '@/components/ui/form-input';

interface PasswordConfirmationFieldsProps {
  password: string;
  confirmation: string;
  passwordLabel: string;
  confirmationLabel: string;
  passwordError?: string;
  confirmationError?: string;
  required?: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
}

export function PasswordConfirmationFields({
  password,
  confirmation,
  passwordLabel,
  confirmationLabel,
  passwordError,
  confirmationError,
  required = false,
  onPasswordChange,
  onConfirmationChange,
}: PasswordConfirmationFieldsProps): React.ReactElement {
  return (
    <>
      <FormInput id="password" label={passwordLabel} type="password" required={required} value={password} onChange={(event) => onPasswordChange(event.target.value)} error={passwordError} showPasswordToggle />
      <FormInput id="repeat-password" label={confirmationLabel} type="password" required={required} value={confirmation} onChange={(event) => onConfirmationChange(event.target.value)} error={confirmationError} showPasswordToggle />
    </>
  );
}

import type { FormEventHandler, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/ui/inline-error';

interface AuthFormProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  error: string | null;
  submitLabel: string;
  loadingLabel: string;
  isLoading: boolean;
  footer?: ReactNode;
}

export function AuthForm({
  onSubmit,
  children,
  error,
  submitLabel,
  loadingLabel,
  isLoading,
  footer,
}: AuthFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-6">
        {children}
        <InlineError error={error || undefined} />
        <Button type="submit" fullWidth isLoading={isLoading} loadingText={loadingLabel}>
          {submitLabel}
        </Button>
      </div>
      {footer}
    </form>
  );
}

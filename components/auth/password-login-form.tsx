'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FormCard } from '@/components/ui/form-card';
import { FormInput } from '@/components/ui/form-input';
import { InlineError } from '@/components/ui/inline-error';
import {
  validateEmail,
  validatePassword,
} from '@/lib/auth/validation';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface PasswordLoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  title: string;
  description: string;
  emailLabel: string;
  passwordLabel: string;
  submitLabel: string;
  loadingLabel: string;
  invalidCredentialsError: string;
  connectionError: string;
  generalError: string;
  emailValidationError: (key: string) => string;
  passwordValidationError: (key: string) => string;
  onAuthenticated: () => Promise<string | null>;
  passwordLabelRightContent?: ReactNode;
  footer?: ReactNode;
}

export function PasswordLoginForm({
  title,
  description,
  emailLabel,
  passwordLabel,
  submitLabel,
  loadingLabel,
  invalidCredentialsError,
  connectionError,
  generalError,
  emailValidationError,
  passwordValidationError,
  onAuthenticated,
  passwordLabelRightContent,
  footer,
  className,
  ...props
}: PasswordLoginFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const validatedEmail = validateEmail(email, emailValidationError);
    const validatedPassword = validatePassword(password, passwordValidationError, {
      requireStrength: false,
    });
    setEmailError(validatedEmail ?? '');
    setPasswordError(validatedPassword ?? '');

    if (validatedEmail || validatedPassword) return;

    setIsLoading(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      const authenticationError = await onAuthenticated();
      if (authenticationError) setError(authenticationError);
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        if (
          caughtError.message.includes('Invalid login credentials') ||
          caughtError.message.includes('Email not confirmed')
        ) {
          setError(invalidCredentialsError);
        } else if (
          caughtError.message === 'Failed to fetch' ||
          caughtError.message.toLowerCase().includes('fetch failed')
        ) {
          setError(connectionError);
        } else {
          setError(caughtError.message);
        }
      } else {
        setError(generalError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-6${className ? ` ${className}` : ''}`} {...props}>
      <FormCard title={title} description={description}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-6">
            <FormInput
              id="email"
              label={emailLabel}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
                setError(null);
              }}
              error={emailError}
            />
            <FormInput
              id="password"
              label={passwordLabel}
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError('');
                setError(null);
              }}
              error={passwordError}
              showPasswordToggle
              labelRightContent={passwordLabelRightContent}
            />
            <InlineError error={error ?? undefined} />
            <Button type="submit" fullWidth isLoading={isLoading} loadingText={loadingLabel}>
              {submitLabel}
            </Button>
          </div>
          {footer}
        </form>
      </FormCard>
    </div>
  );
}

'use client';

import { createClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FormInput } from '@/components/ui/form-input';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/ui/inline-error';
import { validateEmail as validateEmailUtil } from '@/lib/auth-validation';

export function PasswordRecoveryForm({
  initialError,
  clearErrorCookie,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { 
  initialError?: string | null;
  clearErrorCookie?: () => Promise<void>;
}) {
  const t = useTranslations('passwordRecovery');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState<string | null>(initialError === 'invalid-token' ? (authT('errors.invalidToken') || 'Invalid or expired token') : null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialError === 'invalid-token') {
      setError(authT('errors.invalidToken'));
    }
    // Clear the cookie after reading the error
    if (clearErrorCookie) {
      clearErrorCookie();
    }
  }, [initialError, authT, clearErrorCookie]);

  const handleEmailValidation = (emailValue: string): boolean => {
    const error = validateEmailUtil(emailValue, (key) => authT(`errors.${key}`));
    setEmailError(error || '');
    return error === null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError('');

    const isEmailValid = handleEmailValidation(email);
    if (!isEmailValid) {
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/${locale}/update-password`,
      });
      
      if (error) throw error;
      
      setIsSuccess(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(authT('errors.general'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className={`flex flex-col gap-6${className ? ` ${className}` : ''}`}
        {...props}
      >
        <FormCard title={t('successTitle')} description={t('successDescription')}>
          <div className="flex flex-col gap-6">
            <p className="text-sm text-gray-700">{t('successInstructions')}</p>
            <Link
              href={`/${locale}/login`}
              className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              {t('backToLogin')}
            </Link>
          </div>
        </FormCard>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-6${className ? ` ${className}` : ''}`}
      {...props}
    >
      <FormCard title={t('title')} description={t('description')}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-6">
            <FormInput
              id="email"
              label={t('email')}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
                setError(null);
              }}
              error={emailError}
              placeholder="kilian@zegama.com"
            />
            <InlineError error={error || undefined} />
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              loadingText={t('sending')}
            >
              {t('submit')}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            <Link href={`/${locale}/login`} className="underline underline-offset-4">
              {t('backToLogin')}
            </Link>
          </div>
        </form>
      </FormCard>
    </div>
  );
}

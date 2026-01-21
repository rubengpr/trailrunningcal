'use client';

import { createClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

export function PasswordRecoveryForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('passwordRecovery');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (emailValue: string): boolean => {
    const trimmedEmail = emailValue.trim();
    
    if (!trimmedEmail) {
      setEmailError(authT('errors.emailRequired'));
      return false;
    }

    // Check maximum length (RFC 5321: 254 characters)
    if (trimmedEmail.length > 254) {
      setEmailError(authT('errors.emailTooLong'));
      return false;
    }

    // Basic email format check (TLD must be at least 2 characters)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError(authT('errors.emailInvalid'));
      return false;
    }

    // Split email into local and domain parts
    const [localPart, domainPart] = trimmedEmail.split('@');

    // Local part validations
    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      setEmailError(authT('errors.emailInvalid'));
      return false;
    }

    // Domain part validations
    // 1. Edge cases (no leading/trailing dots or hyphens)
    if (domainPart.startsWith('.') || domainPart.endsWith('.') || 
        domainPart.startsWith('-') || domainPart.endsWith('-')) {
      setEmailError(authT('errors.emailInvalid'));
      return false;
    }

    // 2. Consecutive dots
    if (domainPart.includes('..')) {
      setEmailError(authT('errors.emailInvalid'));
      return false;
    }

    // 3. Hyphens adjacent to dots (invalid label boundaries)
    if (domainPart.includes('.-') || domainPart.includes('-.')) {
      setEmailError(authT('errors.emailInvalid'));
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError('');

    const isEmailValid = validateEmail(email);
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
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              {t('successTitle')}
            </h3>
            <p className="text-sm text-gray-500">{t('successDescription')}</p>
          </div>
          <div className="p-6 pt-0">
            <div className="flex flex-col gap-6">
              <p className="text-sm text-gray-700">{t('successInstructions')}</p>
              <Link
                href={`/${locale}/login`}
                className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {t('backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-6${className ? ` ${className}` : ''}`}
      {...props}
    >
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            {t('title')}
          </h3>
          <p className="text-sm text-gray-500">{t('description')}</p>
        </div>
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none"
                >
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                    setError(null);
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="kilian@zegama.com"
                />
                {emailError && <p className="text-sm text-red-500 ml-1">{emailError}</p>}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? t('sending') : t('submit')}
              </button>
            </div>
            <div className="mt-4 text-center text-sm">
              <Link href={`/${locale}/login`} className="underline underline-offset-4">
                {t('backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

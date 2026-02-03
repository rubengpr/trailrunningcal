'use client';

import { createClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormInput } from './form-input';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('login');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

  const validatePassword = (passwordValue: string): boolean => {
    if (!passwordValue.trim()) {
      setPasswordError(authT('errors.passwordRequired'));
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push(`/${locale}/org/perfil`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Check for invalid credentials error
        if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
          setError(t('errors.invalidCredentials'));
        } else {
          setError(error.message);
        }
      } else {
        setError(authT('errors.general'));
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <form onSubmit={handleLogin} noValidate>
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
              />
              <FormInput
                id="password"
                label={t('password')}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                  setError(null);
                }}
                error={passwordError}
                showPasswordToggle
                labelRightContent={
                  <Link
                    href={`/${locale}/password-recovery`}
                    className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
                  >
                    {t('forgotPassword')}
                  </Link>
                }
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? t('loggingIn') : t('submit')}
              </button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t('dontHaveAccount')}{' '}
              <Link href={`/${locale}/sign-up`} className="underline underline-offset-4">
                {t('signUp')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

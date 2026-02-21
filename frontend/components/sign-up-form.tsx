'use client';

import { createClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FormInput } from './form-input';
import {
  validateEmail as validateEmailUtil,
  validatePassword as validatePasswordUtil,
} from '@/lib/auth-validation';

export function SignUpForm({
  initialError,
  clearErrorCookie,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  initialError?: string | null;
  clearErrorCookie?: () => Promise<void>;
}) {
  const t = useTranslations('signUp');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError === 'invalid-token' ? (authT('errors.invalidToken') || 'Invalid or expired token') : null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError('');

    const isEmailValid = handleEmailValidation(email);
    if (!isEmailValid) {
      setIsLoading(false);
      return;
    }

    const passwordError = validatePasswordUtil(password, (key) => authT(`errors.${key}`));
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError(authT('errors.passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/org/perfil`,
        },
      });
      if (error) throw error;
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        setEmailError(t('errors.emailAlreadyExists'));
        return;
      }
      router.push(`/${locale}/sign-up-success`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : authT('errors.general'));
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
          <form onSubmit={handleSignUp} noValidate>
            <div className="flex flex-col gap-6">
              <FormInput
                id="email"
                label={t('email')}
                type="email"
                placeholder="kilian@zegama.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                error={emailError}
              />
              <FormInput
                id="password"
                label={t('password')}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPasswordToggle
              />
              <FormInput
                id="repeat-password"
                label={t('repeatPassword')}
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                showPasswordToggle
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:pointer-events-none disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? t('creatingAccount') : t('submit')}
              </button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t('alreadyHaveAccount')}{' '}
              <Link href={`/${locale}/login`} className="underline underline-offset-4">
                {t('login')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

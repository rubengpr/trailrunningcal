'use client';

import { createClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormInput } from '@/components/ui/form-input';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/ui/inline-error';
import {
  validateEmail as validateEmailUtil,
  validatePassword as validatePasswordUtil,
} from '@/lib/auth-validation';

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

  const handleEmailValidation = (emailValue: string): boolean => {
    const error = validateEmailUtil(emailValue, (key) => authT(`errors.${key}`));
    setEmailError(error || '');
    return error === null;
  };

  const handlePasswordValidation = (passwordValue: string): boolean => {
    const error = validatePasswordUtil(passwordValue, (key) => authT(`errors.${key}`), {
      requireStrength: false,
    });
    setPasswordError(error || '');
    return error === null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isEmailValid = handleEmailValidation(email);
    const isPasswordValid = handlePasswordValidation(password);

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
        } else if (
          error.message === 'Failed to fetch' ||
          error.message.toLowerCase().includes('fetch failed')
        ) {
          setError(authT('errors.connectionError'));
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
      <FormCard title={t('title')} description={t('description')}>
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
            <InlineError error={error || undefined} />
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              loadingText={t('loggingIn')}
            >
              {t('submit')}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            {t('dontHaveAccount')}{' '}
            <Link href={`/${locale}/sign-up`} className="underline underline-offset-4">
              {t('signUp')}
            </Link>
          </div>
        </form>
      </FormCard>
    </div>
  );
}

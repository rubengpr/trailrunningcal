'use client';

import { createClient } from '@/lib/supabase/client';
import { validatePasswordStrength } from '@/lib/password-utils';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormInput } from './form-input';

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('updatePassword');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [repeatPasswordError, setRepeatPasswordError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);



  const validatePassword = (passwordValue: string): boolean => {
    if (!passwordValue.trim()) {
      setPasswordError(authT('errors.passwordRequired'));
      return false;
    }

    if (!validatePasswordStrength(passwordValue)) {
      setPasswordError(authT('errors.passwordStrength'));
      return false;
    }

    setPasswordError('');
    return true;
  };

  const validateRepeatPassword = (repeatPasswordValue: string): boolean => {
    if (!repeatPasswordValue.trim()) {
      setRepeatPasswordError(authT('errors.passwordRequired'));
      return false;
    }

    if (repeatPasswordValue !== password) {
      setRepeatPasswordError(authT('errors.passwordsDoNotMatch'));
      return false;
    }

    setRepeatPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError('');
    setRepeatPasswordError('');

    const isPasswordValid = validatePassword(password);
    const isRepeatPasswordValid = validateRepeatPassword(repeatPassword);

    if (!isPasswordValid || !isRepeatPasswordValid) {
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        if (error.code === 'same_password') {
          setError(authT('errors.samePassword'))
          return
        } else {
          throw error
        }
      }

      router.push(`/${locale}/org/perfil`);
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
              />
              <FormInput
                id="repeat-password"
                label={t('repeatPassword')}
                type="password"
                value={repeatPassword}
                onChange={(e) => {
                  setRepeatPassword(e.target.value);
                  setRepeatPasswordError('');
                  setError(null);
                }}
                error={repeatPasswordError}
                showPasswordToggle
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? t('updating') : t('submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
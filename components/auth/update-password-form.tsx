'use client';

import { createClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormInput } from '@/components/ui/form-input';
import { FormCard } from '@/components/ui/form-card';
import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/ui/inline-error';
import { validatePassword as validatePasswordUtil } from '@/lib/auth/validation';

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



  const handlePasswordValidation = (passwordValue: string): boolean => {
    const error = validatePasswordUtil(passwordValue, (key) => authT(`errors.${key}`));
    setPasswordError(error || '');
    return error === null;
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

    const isPasswordValid = handlePasswordValidation(password);
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
      <FormCard title={t('title')} description={t('description')}>
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
            <InlineError error={error || undefined} />
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              loadingText={t('updating')}
            >
              {t('submit')}
            </Button>
          </div>
        </form>
      </FormCard>
    </div>
  );
}
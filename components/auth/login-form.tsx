'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PasswordLoginForm } from '@/components/auth/password-login-form';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('login');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const handleAuthenticated = async (): Promise<string | null> => {
      router.push(`/${locale}/org/perfil`);
      return null;
  };

  return (
    <PasswordLoginForm
      title={t('title')}
      description={t('description')}
      emailLabel={t('email')}
      passwordLabel={t('password')}
      submitLabel={t('submit')}
      loadingLabel={t('loggingIn')}
      invalidCredentialsError={t('errors.invalidCredentials')}
      connectionError={authT('errors.connectionError')}
      generalError={authT('errors.general')}
      emailValidationError={(key) => authT(`errors.${key}`)}
      passwordValidationError={(key) => authT(`errors.${key}`)}
      onAuthenticated={handleAuthenticated}
      passwordLabelRightContent={
        <Link
          href={`/${locale}/password-recovery`}
          className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
        >
          {t('forgotPassword')}
        </Link>
      }
      footer={
        <div className="mt-4 text-center text-sm">
          {t('dontHaveAccount')}{' '}
          <Link href={`/${locale}/sign-up`} className="underline underline-offset-4">
            {t('signUp')}
          </Link>
        </div>
      }
      className={className}
      {...props}
    />
  );
}

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PasswordLoginForm } from '@/components/auth/password-login-form';

export function AdminLoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('admin.login');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const handleAuthenticated = async (): Promise<string | null> => {
      const checkRes = await fetch('/api/me', { credentials: 'include' });
      const { data: { isAdmin } } = (await checkRes.json()) as { data: { isAdmin: boolean } };
      if (isAdmin) {
        router.push(`/${locale}/admin/eventos/activos`);
        return null;
      }
      return t('errors.notAdmin');
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
      className={className}
      {...props}
    />
  );
}

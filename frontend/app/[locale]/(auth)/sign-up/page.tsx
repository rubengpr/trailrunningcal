import { SignUpForm } from '@/components/auth/sign-up-form';
import { cookies } from 'next/headers';

async function clearAuthErrorCookie() {
  'use server';
  const cookieStore = await cookies();
  cookieStore.delete('auth-error');
}

export default async function Page() {
  const cookieStore = await cookies();
  const authError = cookieStore.get('auth-error')?.value;

  return (
    <SignUpForm
      initialError={authError === 'invalid-token' ? 'invalid-token' : null}
      clearErrorCookie={authError ? clearAuthErrorCookie : undefined}
    />
  );
}

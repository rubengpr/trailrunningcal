'use client';

import { createClient } from '@/lib/supabase/client';
import { validatePasswordStrength } from '@/lib/password-utils';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('signUp');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const validateEmail = (emailValue: string): boolean => {
    const trimmedEmail = emailValue.trim();
    
    if (!trimmedEmail) {
      setEmailError(t('errors.emailRequired'));
      return false;
    }

    // Check maximum length (RFC 5321: 254 characters)
    if (trimmedEmail.length > 254) {
      setEmailError(t('errors.emailTooLong'));
      return false;
    }

    // Basic email format check (TLD must be at least 2 characters)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError(t('errors.emailInvalid'));
      return false;
    }

    // Split email into local and domain parts
    const [localPart, domainPart] = trimmedEmail.split('@');

    // Local part validations
    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      setEmailError(t('errors.emailInvalid'));
      return false;
    }

    // Domain part validations
    // 1. Edge cases (no leading/trailing dots or hyphens)
    if (domainPart.startsWith('.') || domainPart.endsWith('.') || 
        domainPart.startsWith('-') || domainPart.endsWith('-')) {
      setEmailError(t('errors.emailInvalid'));
      return false;
    }

    // 2. Consecutive dots
    if (domainPart.includes('..')) {
      setEmailError(t('errors.emailInvalid'));
      return false;
    }

    // 3. Hyphens adjacent to dots (invalid label boundaries)
    if (domainPart.includes('.-') || domainPart.includes('-.')) {
      setEmailError(t('errors.emailInvalid'));
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError('');

    const isEmailValid = validateEmail(email);
    if (!isEmailValid) {
      setIsLoading(false);
      return;
    }

    if (!validatePasswordStrength(password)) {
      setError(t('errors.passwordStrength'));
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError(t('errors.passwordsDoNotMatch'));
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
          emailRedirectTo: `${window.location.origin}/${locale}/organizador`,
        },
      });
      if (error) throw error;
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        setEmailError(t('errors.emailAlreadyExists'));
        return;
      }
      router.push(`/${locale}/sign-up-success`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('errors.general'));
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
                  placeholder="kilian@zegama.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                
                  <p className="text-sm text-red-500 ml-1">{emailError}</p>
                
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium leading-none"
                  >
                    {t('password')}
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-10 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <label
                    htmlFor="repeat-password"
                    className="text-sm font-medium leading-none"
                  >
                    {t('repeatPassword')}
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="repeat-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-10 text-sm placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
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

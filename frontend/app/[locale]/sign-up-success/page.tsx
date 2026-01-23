'use client';

import { useTranslations } from 'next-intl';

export default function SignUpSuccessPage() {
  const t = useTranslations('signUpSuccess');

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center space-y-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex flex-col space-y-2 text-center">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">
                {t('title')}
              </h3>
              <p className="text-sm text-gray-600">{t('instructions')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

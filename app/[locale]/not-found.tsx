import Link from 'next/link';
import { CircleX, Home } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { PublicPageShell } from '@/components/layout/public-page-shell';
import { EmptyState } from '@/components/ui/empty-state';

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'notFound' });
  const homeUrl = `/${locale}`;

  return (
    <PublicPageShell>
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <EmptyState
          icon={<CircleX className="mx-auto size-40 text-gray-400" strokeWidth={1.5} />}
          title={t('heading')}
          description={t('message')}
          action={
            <Link
              href={homeUrl}
              className="inline-flex items-center px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" strokeWidth={2} />
              {t('backHome')}
            </Link>
          }
        />
      </main>
    </PublicPageShell>
  );
}

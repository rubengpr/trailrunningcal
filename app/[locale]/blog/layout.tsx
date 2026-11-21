import { notFound } from 'next/navigation';
import { PublicPageShell } from '@/components/layout/public-page-shell';
import { isBlogLocale, type Locale } from '@/i18n';

export default async function BlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;

  if (!isBlogLocale(locale)) {
    notFound();
  }

  return (
    <PublicPageShell>
      <main className="grow min-w-0">{children}</main>
    </PublicPageShell>
  );
}

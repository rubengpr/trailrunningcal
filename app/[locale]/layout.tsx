import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/next';
import { PostHogProvider } from '@/components/providers/posthog-provider';
import { locales, type Locale } from '@/i18n';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});


export const metadata: Metadata = {
  title: 'Trail Running Calendar',
  description: 'Calendario de carreras de trail running',
  openGraph: {
    title: 'Trail Running Cal',
    description: 'Calendario de carreras de trail running',
    images: ['/og-image.png'],
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();

  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : 'https://ppmdbmyxgtqvmvtbptmg.supabase.co';

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href={supabaseHost} />
        <meta name="apple-mobile-web-app-title" content="Trailrunningcal" />
      </head>
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#000',
                border: '1px solid #e5e7eb',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </NextIntlClientProvider>
        <PostHogProvider />
        <Analytics />
      </body>
    </html>
  );
}

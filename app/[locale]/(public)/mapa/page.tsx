import { permanentRedirect } from 'next/navigation';
import type { Locale } from '@/i18n';

export default async function MapaPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}`);
}

import { locales, type Locale } from '@/i18n';
import { getEventSlugByRaceLegacySlug } from '@/lib/db/races';
import { notFound, permanentRedirect } from 'next/navigation';

export const revalidate = false;

export default async function RaceRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; race: string }>;
}) {
  const { locale, race } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const eventSlug = await getEventSlugByRaceLegacySlug(race);

  if (!eventSlug) {
    notFound();
  }

  permanentRedirect(`/${locale}/e/${eventSlug}`);
}

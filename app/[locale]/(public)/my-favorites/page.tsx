import { notFound } from 'next/navigation';
import type { Locale } from '@/i18n';
import FavoritesPage, {
  generateMetadata as generateFavoritesMetadata,
} from '@/app/[locale]/(public)/mis-eventos/page';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata(props: PageProps) {
  return generateFavoritesMetadata(props);
}

export default async function EnglishFavoritesPage(props: PageProps) {
  const { locale } = await props.params;

  if (locale !== 'en') {
    notFound();
  }

  return <FavoritesPage {...props} />;
}

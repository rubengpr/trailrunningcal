import { notFound } from 'next/navigation';
import type { Locale } from '@/i18n';
import ContactPage, {
  generateMetadata as generateContactMetadata,
} from '@/app/[locale]/(public)/contacto/page';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata(props: PageProps) {
  return generateContactMetadata(props);
}

export default async function EnglishContactPage(props: PageProps) {
  const { locale } = await props.params;

  if (locale !== 'en') {
    notFound();
  }

  return <ContactPage {...props} />;
}

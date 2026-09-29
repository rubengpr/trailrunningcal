import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  LegalDocumentPage,
  type LegalDocumentContent,
} from '@/components/legal/legal-document-page';
import { buildLegalAlternateLinks } from '@/lib/content/alternate-links';
import { BASE_URL } from '@/lib/config';
import {
  getLegalDocumentId,
  getLegalPath,
  LEGAL_DOCUMENT_IDS,
} from '@/lib/i18n/paths';
import { locales, type Locale } from '@/i18n';

interface LegalPageProps {
  params: Promise<{ locale: Locale; legalDocument: string }>;
}

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { locale, legalDocument: slug } = await params;
  if (!isLocale(locale)) return {};

  const documentId = getLegalDocumentId(locale, slug);
  if (!documentId) return {};

  const t = await getTranslations({ locale, namespace: 'legal' });
  const content = t.raw(`documents.${documentId}`) as LegalDocumentContent;

  return {
    title: content.title,
    description: content.description,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `${BASE_URL}${getLegalPath(locale, documentId)}`,
      languages: buildLegalAlternateLinks(documentId),
    },
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { locale, legalDocument: slug } = await params;
  if (!isLocale(locale)) notFound();

  const documentId = getLegalDocumentId(locale, slug);
  if (!documentId) notFound();

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  const content = t.raw(`documents.${documentId}`) as LegalDocumentContent;

  return (
    <LegalDocumentPage
      content={content}
      documentId={documentId}
      locale={locale}
      lastUpdated={t('lastUpdated')}
      lastUpdatedLabel={t('lastUpdatedLabel')}
      navigationLabel={t('navigationLabel')}
      documentLabels={Object.fromEntries(
        LEGAL_DOCUMENT_IDS.map((legalDocumentId) => [
          legalDocumentId,
          t(`documents.${legalDocumentId}.shortTitle`),
        ]),
      ) as Record<(typeof LEGAL_DOCUMENT_IDS)[number], string>}
    />
  );
}

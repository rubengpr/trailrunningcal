import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/config';
import {
  getLegalPath,
  LEGAL_DOCUMENT_IDS,
  type LegalDocumentId,
} from '@/lib/i18n/paths';
import type { Locale } from '@/i18n';

interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

export interface LegalDocumentContent {
  title: string;
  description: string;
  shortTitle: string;
  sections: LegalSection[];
}

interface LegalDocumentPageProps {
  content: LegalDocumentContent;
  documentId: LegalDocumentId;
  locale: Locale;
  lastUpdated: string;
  lastUpdatedLabel: string;
  navigationLabel: string;
  documentLabels: Record<LegalDocumentId, string>;
}

function TextWithEmail({ text }: { text: string }) {
  const parts = text.split(CONTACT_EMAIL);

  if (parts.length === 1) return text;

  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {index > 0 ? (
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:text-black"
        >
          {CONTACT_EMAIL}
        </a>
      ) : null}
      {part}
    </span>
  ));
}

export function LegalDocumentPage({
  content,
  documentId,
  locale,
  lastUpdated,
  lastUpdatedLabel,
  navigationLabel,
  documentLabels,
}: LegalDocumentPageProps) {
  return (
    <main className="bg-stone-50 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="border-b border-stone-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-600">
            {navigationLabel}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 sm:text-lg">
            {content.description}
          </p>
          <p className="mt-4 text-sm text-stone-500">
            {lastUpdatedLabel}: {lastUpdated}
          </p>
        </header>

        <nav className="my-8 flex flex-wrap gap-2" aria-label={navigationLabel}>
          {LEGAL_DOCUMENT_IDS.map((legalDocumentId) => (
            <Link
              key={legalDocumentId}
              href={getLegalPath(locale, legalDocumentId)}
              aria-current={legalDocumentId === documentId ? 'page' : undefined}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                legalDocumentId === documentId
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-900 hover:text-black'
              }`}
            >
              {documentLabels[legalDocumentId]}
            </Link>
          ))}
        </nav>

        <div className="space-y-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-stone-950 sm:text-2xl">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-7 text-stone-700">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>
                    <TextWithEmail text={paragraph} />
                  </p>
                ))}
                {section.items?.length ? (
                  <ul className="list-disc space-y-2 pl-6 marker:text-gray-700">
                    {section.items.map((item) => (
                      <li key={item}>
                        <TextWithEmail text={item} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

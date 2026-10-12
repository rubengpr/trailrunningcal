'use client';

import { useTranslations } from 'next-intl';

export function BlogDraftInstructions({ instructions }: {
  instructions: string;
}) {
  const t = useTranslations('admin.blog');
  return (
    <section className="rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold">{t('instructions')}</h2>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{instructions}</p>
    </section>
  );
}

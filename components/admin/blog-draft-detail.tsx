'use client';

import { useTranslations } from 'next-intl';
import { sanitizeContent } from '@/lib/blog/sanitize';
import { BlogDraftInstructions } from '@/components/admin/blog-draft-instructions';
import { BlogEvaluationSummary } from '@/components/admin/blog-evaluation-summary';
import type { DraftDetail } from '@/types/blog-draft-record.types';

export function BlogDraftDetail({ draft, onEvaluationAccepted }: { draft: DraftDetail; onEvaluationAccepted:(draft:DraftDetail)=>void }) {
  const t = useTranslations('admin.blog');
  const metadata = [['keyword', draft.primaryKeyword], ['slug', draft.slug], ['seoTitle', draft.seoTitle], ['description', draft.metaDescription]] as const;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight">{draft.title}</h1>
        <BlogEvaluationSummary draft={draft} onAccepted={onEvaluationAccepted} />
      </header>
      <div>
        <div className="min-w-0 space-y-6">
          <BlogDraftInstructions instructions={draft.instructions} />
          <section className="rounded-xl border border-gray-200 p-5"><h2 className="text-sm font-semibold">{t('metadata')}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">{metadata.map(([key, value]) => <div key={key} className={key === 'description' ? 'sm:col-span-2' : ''}><dt className="text-xs text-gray-500">{t(key)}</dt><dd className="mt-1 break-words text-sm leading-relaxed">{value}</dd></div>)}</dl></section>
          <article lang="es" className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="blog-article p-5 sm:p-8 [&_p]:my-4 [&_p]:leading-7 [&_p]:text-gray-700 [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:p-3 [&_td]:border [&_td]:p-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4"
              dangerouslySetInnerHTML={{ __html: sanitizeContent(draft.contentHtml ?? '') }} />
          </article>
        </div>
      </div>
    </div>
  );
}

'use client';
import { allowedLinks } from '@/lib/blog/links';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Heading1 } from 'lucide-react';
import { sanitizeContent } from '@/lib/blog/sanitize';
import { countCharacters } from '@/lib/blog/text';
import { CharacterCountBadge } from '@/components/ui/character-count-badge';
import { BlogDraftInstructions } from '@/components/admin/blog-draft-instructions';
import { BlogEvaluationSummary } from '@/components/admin/blog-evaluation-summary';
import { BlogDraftSection } from '@/components/admin/blog-draft-section';
import { BlogArticleContent } from '@/components/admin/blog-article-content';
import type { DraftDetail } from '@/types/blog-draft-record.types';

export function BlogDraftDetail({ draft, onEvaluationAccepted, actions }: { draft: DraftDetail; onEvaluationAccepted:(draft:DraftDetail)=>void; actions?: ReactNode }) {
  const t = useTranslations('admin.blog');
  const links = allowedLinks(draft.generationContext);
  const contentHtml = sanitizeContent(draft.contentHtml ?? '', links);
  const characterCount = countCharacters(contentHtml);
  const title = draft.title ?? '';
  const lastSpace = title.lastIndexOf(' ');
  const metadata = [['keyword', draft.primaryKeyword], ['slug', draft.slug], ['seoTitle', draft.seoTitle], ['description', draft.metaDescription]] as const;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight">
          {lastSpace >= 0 ? title.slice(0, lastSpace + 1) : ''}
          <span className="whitespace-nowrap">
            {lastSpace >= 0 ? title.slice(lastSpace + 1) : title}
            <Heading1 aria-hidden="true" className="ml-1.5 inline-block size-[0.85em] translate-y-[0.125em] align-baseline text-gray-400" />
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <BlogEvaluationSummary draft={draft} onAccepted={onEvaluationAccepted} />
          {actions}
        </div>
      </header>
      <div>
        <div className="min-w-0 space-y-8">
          <BlogDraftInstructions instructions={draft.instructions} context={draft.generationContext} />
          <BlogDraftSection title={t('metadata')}>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {metadata.map(([key, value]) => (
                <div key={key} className={key === 'description' ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs text-gray-500">{t(key)}</dt>
                  <dd className="mt-1 break-words text-sm leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          </BlogDraftSection>
          <article lang="es" className="min-w-0 border-t border-gray-200 pt-6">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{t('articleHeading')}</h2>
              <CharacterCountBadge count={characterCount} label={t('articleCharacterCount', { count: characterCount })} />
            </div>
            <BlogArticleContent html={contentHtml} links={links} />
          </article>
        </div>
      </div>
    </div>
  );
}

'use client';
import { BlogResearchReport } from '@/components/admin/blog-research-report';
import { ErrorMessage } from '@/components/ui/error-message';
import { allowedLinks } from '@/lib/blog/links';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Heading1 } from 'lucide-react';
import { sanitizeContent } from '@/lib/blog/sanitize';
import { countCharacters } from '@/lib/blog/text';
import { CharacterCountBadge } from '@/components/ui/character-count-badge';
import { BlogDraftResearch } from '@/components/admin/blog-draft-research';
import type { DraftResearchStatus, ResearchPage } from '@/types/blog-research.types';
import { BlogDraftInstructions } from '@/components/admin/blog-draft-instructions';
import { BlogEvaluationSummary } from '@/components/admin/blog-evaluation-summary';
import { BlogDraftSection } from '@/components/admin/blog-draft-section';
import { BlogCostSummary } from '@/components/admin/blog-cost-summary';
import { BlogArticleContent } from '@/components/admin/blog-article-content';
import type { DraftDetail } from '@/types/blog-draft-record.types';

const emptyResearch: ResearchPage = {runs:[],pagination:{page:1,pageSize:50,total:0,totalPages:0}};

export function BlogDraftDetail({ draft, onEvaluationAccepted, actions, initialResearch, onResearchStatus }: { draft: DraftDetail; onEvaluationAccepted:(draft:DraftDetail)=>void; actions?: ReactNode; initialResearch?: ResearchPage; onResearchStatus?:(status:DraftResearchStatus)=>void }) {
  const t = useTranslations('admin.blog');
  const links = draft.articleLinks?.length ? draft.articleLinks : allowedLinks(draft.generationContext);
  const missing = draft.research?.results.filter(result => !result.dossier).map(result => result.eventName) ?? [];
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
          {draft.research ? <BlogDraftSection title={t('selection.heading')}>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">{draft.research.regionName}</span>
              <ul className="flex flex-wrap gap-1.5">
                {draft.research.results.map(result => <li key={result.eventId} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">{result.eventName}</li>)}
              </ul>
            </div>
          </BlogDraftSection> : <BlogDraftInstructions instructions={draft.instructions} context={draft.generationContext} />}
          {missing.length ? <ErrorMessage title={t('missingSectionsTitle')} message={t('missingSections',{events:missing.join(', ')})} showRetry={false} variant="compact" /> : null}
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
          {draft.generationContext && onResearchStatus ? <BlogDraftResearch key={draft.id} id={draft.id} context={draft.generationContext}
            initial={initialResearch ?? emptyResearch} status={draft.researchStatus ?? 'not_started'} onStatusChange={onResearchStatus} /> : null}
          {draft.research ? <BlogDraftSection title={t('research.title')}><div className="mt-4"><BlogResearchReport run={draft.research} /></div></BlogDraftSection> : null}
          {draft.costs !== undefined ? <BlogCostSummary costs={draft.costs} /> : null}
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

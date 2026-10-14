'use client';
import { safeSourceUrl } from '@/lib/blog/research/result';
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { LoaderCircle, Search } from 'lucide-react';
import { BlogDraftSection } from '@/components/admin/blog-draft-section';
import { BlogResearchDossier } from '@/components/admin/blog-research-dossier';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { useBlogResearch } from '@/hooks/use-blog-research';
import type { DraftResearchStatus, ResearchPage } from '@/types/blog-research.types';
import type { SelectionContext } from '@/types/blog-selection.types';

export function BlogDraftResearch({id,context,initial,status,onStatusChange}: {
  id:string;context:SelectionContext;initial:ResearchPage;status:DraftResearchStatus;
  onStatusChange:(status:DraftResearchStatus)=>void;
}) {
  const t = useTranslations('admin.blog.research');
  const format = useFormatter();
  const [selected,setSelected] = useState(() => context.events.map(event => event.id));
  const [runId,setRunId] = useState<string | null>(null);
  const active = status === 'queued' || status === 'running';
  const resource = useBlogResearch(id,initial,active,onStatusChange);
  const disabled = active || resource.sending;
  const run = resource.data.runs.find(run => run.id === runId) ?? resource.data.runs[0];
  const finished = run?.results.filter(result => result.status === 'completed' || result.status === 'failed').length ?? 0;
  return <BlogDraftSection title={t('title')}>
    <div className="mt-4 space-y-5">
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="mb-2 text-sm text-gray-600">{t('selection')}</legend>
        {context.events.map(event => <label key={event.id} className={`flex items-start gap-2 text-sm ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
          <input type="checkbox" checked={selected.includes(event.id)} className="mt-0.5 size-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={() => setSelected(current => current.includes(event.id) ? current.filter(id => id !== event.id) : [...current,event.id])} />
          {event.name}
        </label>)}
      </fieldset>
      <Button type="button" disabled={disabled} onClick={() => {setRunId(null);void resource.submit(selected);}} className="gap-2">
        {disabled ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
        {t(resource.sending ? 'sending' : active ? 'investigating' : 'start')}
      </Button>
      {resource.error ? <ErrorMessage message={t(resource.error)} showRetry={false} variant="compact" /> : null}
      {resource.readFailed ? <ErrorMessage message={t('readFailed')} showRetry={false} variant="compact" /> : null}
      {resource.data.runs.length ? <>
        <label className="block space-y-2 text-sm font-medium">{t('history')}
          <select value={run?.id ?? ''} onChange={event => setRunId(event.target.value)} className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white p-2 text-sm font-normal">
            {resource.data.runs.map(item => <option key={item.id} value={item.id}>
              {format.dateTime(new Date(item.createdAt),{dateStyle:'medium',timeStyle:'medium'})} · {item.provider} · {item.model} · {t('states.'+item.status)}
            </option>)}
          </select>
        </label>
        {resource.data.pagination.totalPages > 1 ? <AdminPagination page={resource.data.pagination.page}
          totalPages={resource.data.pagination.totalPages} getHref={page => `?researchPage=${page}`}
          onPageChange={page => {setRunId(null);resource.setPage(page);}} /> : null}
        {run ? <div className="space-y-4">
          <p role="status" className="text-sm text-gray-600">{t('progress',{count:finished,total:run.results.length})} · {t('states.'+run.status)}</p>
          {run.results.map(result => <details key={result.id} className="border-t border-gray-200 pt-3">
            <summary className="cursor-pointer text-sm font-medium">{result.eventName} · {t('states.'+result.status)}</summary>
            <div className="mt-3 pl-4">
              {result.dossier ? <BlogResearchDossier dossier={result.dossier} labels={{sources:t('sources'),observations:t('observations')}} /> :
                result.status === 'failed' ? <ErrorMessage message={t('resultFailed')} showRetry={false} variant="compact" /> :
                  <p className="flex items-center gap-2 text-sm text-gray-600"><LoaderCircle className="size-4 animate-spin" />{t('investigating')}</p>}
              {result.consultedSources.length ? <details className="mt-4">
                <summary className="cursor-pointer text-xs text-gray-500">{t('consultedSources',{count:result.consultedSources.length})}</summary>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">{result.consultedSources.filter(url => safeSourceUrl(url)).map(url => <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="cursor-pointer break-all text-blue-700 underline">{url}</a>
                </li>)}</ul>
              </details> : null}
            </div>
          </details>)}
        </div> : null}
      </> : <p className="text-sm text-gray-500">{t('empty')}</p>}
    </div>
  </BlogDraftSection>;
}

'use client';
import { useTranslations } from 'next-intl';
import { LoaderCircle } from 'lucide-react';
import { safeSourceUrl } from '@/lib/blog/research/result';
import { BlogResearchDossier } from '@/components/admin/blog-research-dossier';
import { ErrorMessage } from '@/components/ui/error-message';
import type { ResearchRun } from '@/types/blog-research.types';

export function BlogResearchReport({run}: {run:ResearchRun}) {
  const t = useTranslations('admin.blog.research');
  const finished = run.results.filter(result => result.status === 'completed' || result.status === 'failed').length;
  return <div className="space-y-4">
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
        </div>;
}

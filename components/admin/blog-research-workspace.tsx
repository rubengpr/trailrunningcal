'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import { useLocale, useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { BlogDraftForm } from '@/components/admin/blog-draft-form';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { ErrorMessage } from '@/components/ui/error-message';
import { useBlog } from '@/hooks/use-blog';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { listResearch } from '@/lib/api/blog-research';
import type { ResearchPage } from '@/types/blog-research.types';

export function BlogResearchWorkspace({initial}: {initial:ResearchPage}) {
  const t = useTranslations('admin.blog.research');
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const {researchAccepted} = useBlog();
  const handled = useRef(researchAccepted?.id);
  const page = initial.pagination.page;
  const load = useCallback((signal:AbortSignal) => listResearch(page,signal),[page]);
  const resource = usePolledResource(initial,load,value => value.runs.some(run => run.status === 'queued' || run.status === 'running'));
  const {update} = resource;
  useEffect(() => {
    if (!researchAccepted || handled.current === researchAccepted.id) return;
    handled.current = researchAccepted.id;
    if (page !== 1) {router.replace(`/${locale}/admin/blog/research`);return;}
    update(current => {
      if (current.runs.some(run => run.id === researchAccepted.id)) return current;
      const total = current.pagination.total + 1;
      return {runs:[researchAccepted,...current.runs].slice(0,50),pagination:{...current.pagination,total,totalPages:Math.ceil(total/50)}};
    });
  },[researchAccepted,page,locale,router,update]);
  return <div className="space-y-6">
    <Link href={`/${locale}/admin/blog`} className="cursor-pointer text-sm text-gray-500 hover:text-gray-900">{t('backToBlog')}</Link>
    <h1 className="text-2xl font-semibold">{t('title')}</h1>
    <p className="text-sm text-gray-600">{t('independentDescription')}</p>
    <BlogDraftForm research />
    <h2 className="text-lg font-semibold">{t('history')}</h2>
    {resource.readFailed ? <ErrorMessage message={t('readFailed')} onRetry={resource.refresh} variant="compact" /> : null}
    {!resource.data.runs.length ? <p className="text-sm text-gray-500">{t('empty')}</p> : <ul className="divide-y divide-gray-200">
      {resource.data.runs.map(run => <li key={run.id}>
        <Link href={`/${locale}/admin/blog/research/${run.id}`} className="block cursor-pointer space-y-1 py-4 hover:bg-gray-50">
          <span className="block font-medium">{run.regionName}</span>
          <span className="block text-sm text-gray-600">{run.results.map(result => result.eventName).join(' · ')}</span>
          <span className="block text-xs text-gray-500">{format.dateTime(new Date(run.createdAt),{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Paris'})} · {run.provider} · {run.model} · {t('states.'+run.status)}</span>
          <span className="block text-xs text-gray-600">{t('progress',{count:run.results.filter(result => ['completed','failed'].includes(result.status)).length,total:run.results.length})}</span>
        </Link>
      </li>)}
    </ul>}
    {resource.data.pagination.totalPages > 1 ? <AdminPagination page={page} totalPages={resource.data.pagination.totalPages}
      getHref={value => `/${locale}/admin/blog/research?page=${value}`} /> : null}
  </div>;
}

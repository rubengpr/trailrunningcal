'use client';
import Link from 'next/link';
import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BlogResearchReport } from '@/components/admin/blog-research-report';
import { ErrorMessage } from '@/components/ui/error-message';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { getResearch } from '@/lib/api/blog-research';
import type { ResearchRun } from '@/types/blog-research.types';

export function BlogResearchView({initial}: {initial:ResearchRun}) {
  const locale = useLocale();
  const t = useTranslations('admin.blog.research');
  const load = useCallback((signal:AbortSignal) => getResearch(initial.id,signal),[initial.id]);
  const resource = usePolledResource(initial,load,run => run.status === 'queued' || run.status === 'running');
  return <div className="space-y-6">
    <Link href={`/${locale}/admin/blog/research`} className="cursor-pointer text-sm text-gray-500 hover:text-gray-900">{t('backToResearch')}</Link>
    <h1 className="text-2xl font-semibold">{t('title')} · {resource.data.regionName}</h1>
    <p className="text-sm text-gray-500">{resource.data.provider} · {resource.data.model}</p>
    {resource.readFailed ? <ErrorMessage message={t('readFailed')} onRetry={resource.refresh} variant="compact" /> : null}
    <BlogResearchReport run={resource.data} />
  </div>;
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LoaderCircle } from 'lucide-react';
import { useBlog } from '@/hooks/use-blog';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { listDrafts } from '@/lib/api/blog-drafts';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { ErrorMessage } from '@/components/ui/error-message';
import type { DraftPage } from '@/types/blog-draft-record.types';
import { BlogDraftForm } from '@/components/admin/blog-draft-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function BlogDraftList({ initial }: { initial: DraftPage }) {
  const t = useTranslations('admin.blog');
  const locale = useLocale();
  const router = useRouter();
  const { accepted } = useBlog();
  const handled = useRef(accepted?.id);
  const load = useCallback((signal: AbortSignal) => listDrafts(initial.pagination.page, signal), [initial.pagination.page]);
  const { data, update, readFailed, now } = usePolledResource(initial, load,
    value => value.drafts.some(d => d.status === 'queued' || d.status === 'running' || d.evaluationStatus === 'queued' || d.evaluationStatus === 'running'));
  useEffect(() => {
    if (!accepted || handled.current === accepted.id) return;
    handled.current = accepted.id;
    if (initial.pagination.page !== 1) { router.replace(`/${locale}/admin/blog`); return; }
    if (!data.drafts.some(d => d.id === accepted.id)) {
      const total = data.pagination.total + 1;
      update({ drafts: [{ ...accepted, score: accepted.evaluation?.score ?? null }, ...data.drafts].slice(0, 50),
        pagination: { ...data.pagination, total, totalPages: Math.ceil(total / 50) } });
    }
  }, [accepted, data, initial.pagination.page, locale, router, update]);
  const sorted = data.drafts;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'Europe/Paris',
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('drafts')}</h1>
      <BlogDraftForm />
      {readFailed ? <ErrorMessage message={t('readFailed')} showRetry={false} variant="compact" /> : null}
      {sorted.some(d => (d.status === 'queued' || d.status === 'running') && now - Date.parse(d.createdAt) >= 30_000)
        ? <p role="status" className="text-sm text-amber-800">{t('takingLong')}</p> : null}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">{t('empty')}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableCell header>{t('title')}</TableCell>
            <TableCell header className="whitespace-nowrap">{t('dateColumn')}</TableCell>
            <TableCell header align="right" className="whitespace-nowrap">{t('scoreColumn')}</TableCell>
          </TableHeader>
          <TableBody>
            {sorted.map(draft => (
              <TableRow key={draft.id} clickable className="align-middle" onClick={event => {
                if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('a'))) return;
                router.push(`/${locale}/admin/blog/${draft.id}`);
              }}>
                <TableCell className="min-w-[200px]">
                  <Link href={`/${locale}/admin/blog/${draft.id}`} className="cursor-pointer text-sm font-medium text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">
                    {draft.title || draft.instructions.replace(/\s+/g, ' ').slice(0, 80)}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-gray-700">
                  <time dateTime={draft.createdAt}>{dateFormatter.format(new Date(draft.createdAt))}</time>
                </TableCell>
                <TableCell align="right">
                  {draft.status === 'queued' || draft.status === 'running' ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-gray-500">
                      <LoaderCircle className="size-4 animate-spin" />{t('generationPending')}
                    </span>
                  ) : draft.status === 'failed' ? (
                    <span className="text-sm font-medium text-red-700">{t('failedStatus')}</span>
                  ) : draft.evaluationStatus === 'queued' || draft.evaluationStatus === 'running' ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-gray-500"><LoaderCircle className="size-4 animate-spin" />{t('evaluationStates.running')}</span>
                  ) : draft.score === null ? (
                    <span className={draft.evaluationStatus === 'failed' ? 'text-sm text-red-700' : 'text-sm text-gray-500'}>{t('evaluationStates.'+draft.evaluationStatus)}</span>
                  ) : (
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
                      draft.score >= 90 ? 'bg-green-50 text-green-700'
                        : draft.score >= 50 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {draft.score}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {data.pagination.totalPages > 1 ? <AdminPagination page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        getHref={page => page === 1 ? `/${locale}/admin/blog` : `/${locale}/admin/blog?page=${page}`} /> : null}
    </div>
  );
}

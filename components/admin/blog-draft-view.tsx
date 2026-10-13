'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { BlogDraftDetail } from '@/components/admin/blog-draft-detail';
import { BlogDeleteAction } from '@/components/admin/blog-delete-action';
import { BlogDraftInstructions } from '@/components/admin/blog-draft-instructions';
import { ErrorMessage } from '@/components/ui/error-message';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { getDraft } from '@/lib/api/blog-drafts';
import type { DraftDetail } from '@/types/blog-draft-record.types';

export function BlogDraftView({ initial }: { initial: DraftDetail }) {
  const t = useTranslations('admin.blog');
  const navigation = useTranslations('sidebar');
  const locale = useLocale();
  const router = useRouter();
  const load = useCallback((signal: AbortSignal) => getDraft(initial.id, signal), [initial.id]);
  const { data: draft, update, refresh, readFailed, now } = usePolledResource(initial, load,
    value => value.status === 'queued' || value.status === 'running' || value.evaluationStatus === 'queued' || value.evaluationStatus === 'running');
  const failureCodes = ['timeout', 'api_error', 'refused', 'incomplete', 'invalid_content', 'start_failed', 'save_failed', 'workflow_error'];
  const title = draft.title || draft.instructions.replace(/\s+/g, ' ').slice(0, 80);
  const deleteAction = <BlogDeleteAction draft={draft} onConflict={() => {
    update(current => current); void refresh();
  }} onDeleted={() => {
    update(current => current);
    router.replace(`/${locale}/admin/blog`); router.refresh();
  }} />;
  return <div className="space-y-6">
    <div className="pb-4">
      <Breadcrumb items={[{ name: navigation('blog'), href: `/${locale}/admin/blog` }, { name: title }]} />
    </div>
    {readFailed ? <ErrorMessage message={t('readFailed')} showRetry={false} variant="compact" /> : null}
    {draft.status === 'completed' ? <BlogDraftDetail draft={draft} onEvaluationAccepted={update} actions={deleteAction} /> : <>
      <header className="flex items-start justify-between gap-4">
        <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight">{title}</h1>
        {deleteAction}
      </header>
      <BlogDraftInstructions instructions={draft.instructions} />
      {draft.status === 'failed' ? <ErrorMessage title={t('generationFailedTitle')}
        message={failureCodes.includes(draft.errorCode ?? '') ? t('failures.' + draft.errorCode) : t('generationFailed')}
        showRetry={false} variant="compact" /> :
        <div role="status" className="flex items-start gap-3 rounded-xl border border-gray-200 p-5 text-sm text-gray-600">
          <LoaderCircle className="size-5 shrink-0 animate-spin" /><div><p>{t('generationNotice')}</p>
            {now - Date.parse(draft.createdAt) >= 30_000 ? <p className="mt-2 text-amber-800">{t('takingLong')}</p> : null}
          </div>
        </div>}
    </>}
  </div>;
}

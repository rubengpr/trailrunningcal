'use client';
import { LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useBlogEvaluation } from '@/hooks/use-blog-evaluation';
import { BlogSeoModal } from '@/components/admin/blog-seo-modal';
import { BlogSeoEvaluation } from '@/components/admin/blog-seo-evaluation';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import type { DraftDetail } from '@/types/blog-draft-record.types';

export function BlogEvaluationSummary({draft,onAccepted}:{draft:DraftDetail;onAccepted:(draft:DraftDetail)=>void}) {
  const t = useTranslations('admin.blog');
  const {sending,requestFailed,submit} = useBlogEvaluation(draft.id,onAccepted);
  const pending = draft.evaluationStatus === 'queued' || draft.evaluationStatus === 'running';
  if (draft.evaluation) return <BlogSeoModal score={draft.evaluation.score}>
    {draft.editorialStatus ? <p className="mb-4 text-sm font-medium text-gray-700">
      {t('editorialStates.'+draft.editorialStatus)} · {t('criticalCount',{count:draft.criticalCount})}
    </p> : null}
    <BlogSeoEvaluation evaluation={draft.evaluation} />
  </BlogSeoModal>;
  return <div className="flex max-w-md flex-col gap-3">
    <span role="status" className="inline-flex items-center gap-2 text-sm text-gray-600">
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {t('evaluationStates.'+draft.evaluationStatus)}
    </span>
    {!pending ? <Button type="button" onClick={() => void submit()} disabled={sending}>
      {sending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {t(sending ? 'sending' : draft.evaluationStatus === 'failed' ? 'retryEvaluation' : 'evaluateArticle')}
    </Button> : null}
    {draft.evaluationStatus === 'failed' ? <ErrorMessage message={t('evaluationFailed')} showRetry={false} variant="compact" /> : null}
    {requestFailed ? <ErrorMessage message={t('evaluationRequestFailed')} showRetry={false} variant="compact" /> : null}
  </div>;
}

'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { formatDurationMs } from '@/lib/utils/format-duration';
import type { PageStats } from '@/types/races-scrape-api.types';

export type ImportPipelineRowKind = 'loading' | 'success' | 'error' | 'pending';

export interface ImportPipelineRowConfig {
  kind: ImportPipelineRowKind;
  titleKey?: string;
  errorDetail?: string | null;
}

export interface PersistedImportPipelineRow extends ImportPipelineRowConfig {
  durationMs: number | null;
  pageStats?: PageStats | null;
}

interface ImportPipelineProgressProps {
  persistedRows: PersistedImportPipelineRow[];
  activeSteps: { row1: ImportPipelineRowConfig; row2: ImportPipelineRowConfig } | null;
  crawlStepDurationMs: number | null;
  llmStepDurationMs: number | null;
  pageStats: PageStats | null;
  showFullPageStats: boolean;
  showIngestPageStats: boolean;
}

function PipelineRowIcon({ kind }: { kind: ImportPipelineRowKind }): React.ReactElement {
  if (kind === 'loading') {
    return <div className="pipeline-loading-dot h-2.5 w-2.5 shrink-0 translate-y-px rounded-full bg-radial-[at_50%_50%] from-gray-300 to-gray-200" aria-hidden />;
  }
  if (kind === 'success') {
    return <div className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-full bg-radial-[at_50%_50%] from-green-300 to-green-200" aria-hidden />;
  }
  if (kind === 'error') {
    return <XCircle className="h-4 w-4 shrink-0 text-red-600" strokeWidth={2} aria-hidden />;
  }
  return <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-xs leading-none text-gray-300" aria-hidden>—</span>;
}

function PageStatsBadges({ pageStats, size = 'sm' }: { pageStats: PageStats; size?: 'sm' | 'md' }): React.ReactElement {
  const t = useTranslations('admin.events.import');
  const classes = size === 'sm' ? 'px-2 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <>
      <span className={`inline-flex items-center rounded-full border border-gray-200/80 bg-gray-100 font-medium text-gray-800 tabular-nums ${classes}`}>
        {t('crawledPagesTotal', { scrapedPages: pageStats.total })}
      </span>
      <span className={`inline-flex items-center rounded-full border border-green-200/80 bg-green-100 font-medium text-green-800 tabular-nums ${classes}`}>
        {t('crawledPagesHttpSuccess', { successPages: pageStats.successCount })}
      </span>
      <span className={`inline-flex items-center rounded-full border border-red-200/80 bg-red-100 font-medium text-red-800 tabular-nums ${classes}`}>
        {t('crawledPagesHttpError', { errorPages: pageStats.errorCount })}
      </span>
    </>
  );
}

function PipelineRow({ kind, title, durationMs, errorDetail, children }: {
  kind: ImportPipelineRowKind;
  title?: string;
  durationMs?: number | null;
  errorDetail?: string | null;
  children?: ReactNode;
}): React.ReactElement {
  const t = useTranslations('admin.events.import');

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-5 w-4 shrink-0 flex-col items-center justify-center">
        <PipelineRowIcon kind={kind} />
      </div>
      <div className="min-w-0 flex-1">
        {title !== undefined ? (
          <>
            <p className={`flex flex-wrap items-center gap-x-2 text-sm font-medium leading-5 ${kind === 'error' ? 'text-red-700' : 'text-gray-900'}`}>
              <span>{title}</span>
              {durationMs != null ? (
                <span className="text-xs font-normal text-gray-500 tabular-nums">
                  {t('fullPipelineStepDuration', { duration: formatDurationMs(durationMs) })}
                </span>
              ) : null}
              {children}
            </p>
            {errorDetail ? <p className="mt-0.5 text-xs text-red-600">{errorDetail}</p> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ImportPipelineProgress({
  persistedRows,
  activeSteps,
  crawlStepDurationMs,
  llmStepDurationMs,
  pageStats,
  showFullPageStats,
  showIngestPageStats,
}: ImportPipelineProgressProps): React.ReactElement | null {
  const t = useTranslations('admin.events.import');
  const hasPipeline = activeSteps !== null || persistedRows.length > 0;

  if (!hasPipeline && !(showIngestPageStats && pageStats)) return null;

  return (
    <>
      {hasPipeline ? (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          {persistedRows.map((row, index) => (
            <PipelineRow
              key={`persisted-${index}`}
              kind={row.kind}
              title={row.titleKey !== undefined ? t(row.titleKey) : undefined}
              durationMs={row.durationMs}
              errorDetail={row.errorDetail}
            >
              {row.pageStats ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <PageStatsBadges pageStats={row.pageStats} />
                </span>
              ) : null}
            </PipelineRow>
          ))}
          {activeSteps ? (
            <>
              <PipelineRow
                kind={activeSteps.row1.kind}
                title={activeSteps.row1.titleKey !== undefined ? t(activeSteps.row1.titleKey) : undefined}
                durationMs={crawlStepDurationMs}
                errorDetail={activeSteps.row1.errorDetail}
              >
                {showFullPageStats && pageStats ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <PageStatsBadges pageStats={pageStats} />
                  </span>
                ) : null}
              </PipelineRow>
              <PipelineRow
                kind={activeSteps.row2.kind}
                title={activeSteps.row2.titleKey !== undefined ? t(activeSteps.row2.titleKey) : undefined}
                durationMs={llmStepDurationMs}
                errorDetail={activeSteps.row2.errorDetail}
              />
            </>
          ) : null}
        </div>
      ) : null}
      {showIngestPageStats && pageStats ? (
        <div className="flex flex-wrap items-center gap-2">
          <PageStatsBadges pageStats={pageStats} size="md" />
        </div>
      ) : null}
    </>
  );
}

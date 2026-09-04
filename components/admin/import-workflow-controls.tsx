'use client';

import { Play, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ImportPipelineProgress } from '@/components/admin/import-pipeline-progress';
import type { ImportPipelineRowConfig, PersistedImportPipelineRow } from '@/components/admin/import-pipeline-progress';
import { Button } from '@/components/ui/button';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import { IconButton } from '@/components/ui/icon-button';
import { formatDurationMs } from '@/lib/utils/format-duration';
import type { PageStats } from '@/types/races-scrape-api.types';

interface ImportWorkflowControlsProps {
  workflow: 'bulk' | 'full' | 'ingest' | 'llmFromFile' | 'research';
  canRun: boolean;
  isScraping: boolean;
  isStartingBatch: boolean;
  isStartingResearch: boolean;
  primaryLoadingLabel: string;
  scrapeMarkdown: string | null;
  rawModelOutput: string | null;
  persistedPipelineRows: PersistedImportPipelineRow[];
  activePipelineSteps: { row1: ImportPipelineRowConfig; row2: ImportPipelineRowConfig } | null;
  crawlStepDurationMs: number | null;
  llmStepDurationMs: number | null;
  pageStats: PageStats | null;
  liveElapsedMs: number;
  lastRunDurationMs: number | null;
  onRun: () => void;
  onDownloadMarkdown: () => void;
  onDownloadJson: () => void;
  onLoadDummyPreview: () => void;
  onRestart: () => void;
}

export function ImportWorkflowControls(props: ImportWorkflowControlsProps): React.ReactElement {
  const t = useTranslations('admin.events.import');
  const busy = props.isScraping || props.isStartingBatch || props.isStartingResearch;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <Button type="button" onClick={props.onRun} disabled={!props.canRun} isLoading={busy} loadingText={props.primaryLoadingLabel}>
          <span className="inline-flex items-center gap-2"><Play className="size-4 shrink-0" strokeWidth={2} aria-hidden />{t('runWorkflowButton')}</span>
        </Button>
        {props.workflow !== 'bulk' && props.workflow !== 'research' && (props.scrapeMarkdown || props.rawModelOutput) && (
          <IconActionMenu triggerAriaLabel={t('downloadMenuTriggerLabel')} disabled={props.isScraping} items={[
            { id: 'markdown', label: t('downloadMenuMarkdown'), disabled: !props.scrapeMarkdown, onSelect: props.onDownloadMarkdown },
            { id: 'json', label: t('downloadMenuJson'), disabled: !props.rawModelOutput, onSelect: props.onDownloadJson },
          ]} />
        )}
        <Button type="button" variant="secondary" onClick={props.onLoadDummyPreview} disabled={busy || props.workflow === 'research'}>{t('loadDummyPreview')}</Button>
        <IconButton onClick={props.onRestart} disabled={busy} title={t('restart')}><RotateCcw className="h-4 w-4" strokeWidth={2} /></IconButton>
      </div>
      <ImportPipelineProgress persistedRows={props.persistedPipelineRows} activeSteps={props.activePipelineSteps} crawlStepDurationMs={props.crawlStepDurationMs} llmStepDurationMs={props.llmStepDurationMs} pageStats={props.pageStats} showFullPageStats={props.workflow === 'full'} showIngestPageStats={props.workflow === 'ingest'} />
      {props.isScraping && <p className="text-xs text-gray-500 tabular-nums">{t('runDurationRunning', { duration: formatDurationMs(props.liveElapsedMs) })}</p>}
      {!props.isScraping && props.lastRunDurationMs !== null && <p className="text-xs text-gray-500 tabular-nums">{t('runDurationComplete', { duration: formatDurationMs(props.lastRunDurationMs) })}</p>}
    </>
  );
}

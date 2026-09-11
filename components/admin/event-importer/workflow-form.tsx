'use client';

import type { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import type { ComboboxOption } from '@/components/ui/combobox';
import { TabSwitcher } from '@/components/ui/tab-switcher';
import { ImportFileUploadPanel } from '@/components/admin/import-file-upload-panel';
import { ImportWorkflowFields } from '@/components/admin/import-workflow-fields';
import { ImportWorkflowControls } from '@/components/admin/import-workflow-controls';
import { ResearchWorkflowPanel } from '@/components/admin/research-workflow-panel';
import type { FileUpload } from '@/hooks/use-file-upload';
import type { ScrapeSourceMode, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { useBatchImport } from '@/components/admin/event-importer/use-batch-import';
import type { useResearchWorkflow } from '@/components/admin/event-importer/use-research-workflow';
import type { ImportPipelineRowConfig, PersistedImportPipelineRow } from '@/components/admin/import-pipeline-progress';
import type { PageStats } from '@/types/races-scrape-api.types';

interface WorkflowFormProps {
    t: ReturnType<typeof useTranslations>;
    workflow: ScrapeWorkflow;
    sourceMode: ScrapeSourceMode;
    websiteUrl: string;
    pendingUrlOptions: ComboboxOption[];
    selectedModelId: OpenRouterScrapeModelId;
    selectedVisionModelId: OpenRouterVisionModelId;
    isScraping: boolean;
    canRunWorkflow: boolean;
    batch: ReturnType<typeof useBatchImport>;
    research: ReturnType<typeof useResearchWorkflow>;
    fileUpload: FileUpload;
    primaryLoadingLabel: string;
    scrapeMarkdown: string | null;
    rawModelOutput: string | null;
    persistedPipelineRows: PersistedImportPipelineRow[];
    fullPipelineSteps: { row1: ImportPipelineRowConfig; row2: ImportPipelineRowConfig } | null;
    fullPipelineCrawlStepMs: number | null;
    fullPipelineLlmStepMs: number | null;
    pageStats: PageStats | null;
    liveElapsedMs: number;
    lastRunDurationMs: number | null;
    onWorkflowChange: (next: ScrapeWorkflow) => void;
    onWebsiteUrlChange: (value: string) => void;
    onSourceModeChange: (value: ScrapeSourceMode) => void;
    onModelChange: (value: OpenRouterScrapeModelId) => void;
    onVisionModelChange: (value: OpenRouterVisionModelId) => void;
    onClearUpload: () => void;
    onRunWorkflow: () => void;
    onDownloadMarkdown: () => void;
    onDownloadRawModelOutput: () => void;
    onLoadDummyPreview: () => void;
    onRestart: () => void;
}

export function WorkflowForm({
    t,
    workflow,
    sourceMode,
    websiteUrl,
    pendingUrlOptions,
    selectedModelId,
    selectedVisionModelId,
    isScraping,
    canRunWorkflow,
    batch,
    research,
    fileUpload,
    primaryLoadingLabel,
    scrapeMarkdown,
    rawModelOutput,
    persistedPipelineRows,
    fullPipelineSteps,
    fullPipelineCrawlStepMs,
    fullPipelineLlmStepMs,
    pageStats,
    liveElapsedMs,
    lastRunDurationMs,
    onWorkflowChange,
    onWebsiteUrlChange,
    onSourceModeChange,
    onModelChange,
    onVisionModelChange,
    onClearUpload,
    onRunWorkflow,
    onDownloadMarkdown,
    onDownloadRawModelOutput,
    onLoadDummyPreview,
    onRestart,
}: WorkflowFormProps) {
    const { uploadKind } = fileUpload;

    return (
        <div>
            <div className="space-y-6">
                <TabSwitcher
                    tabs={[
                        {
                            id: 'full',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <Sparkles className="size-4" strokeWidth={1.5} />
                                    {t('workflowCrawlAndLlm')}
                                </span>
                            ),
                        },
                        { id: 'bulk', label: t('workflowBulk') },
                        { id: 'research', label: t('workflowResearch') },
                        { id: 'ingest', label: t('workflowIngest') },
                        { id: 'llmFromFile', label: t('workflowLlmFromFile') },
                    ]}
                    activeId={workflow}
                    onChange={(id) => onWorkflowChange(id as ScrapeWorkflow)}
                    disabled={isScraping || batch.isStartingBatch || research.isStartingResearch}
                />

                {workflow === 'bulk' && (
                    <div className="grid gap-2 w-full max-w-xl">
                        <label htmlFor="batchUrls" className="text-sm font-medium leading-none text-gray-900">
                            {t('bulk.urlsLabel')}
                        </label>
                        <textarea
                            id="batchUrls"
                            value={batch.batchUrlsInput}
                            onChange={(event) => batch.setBatchUrlsInput(event.target.value)}
                            placeholder={t('bulk.urlsPlaceholder')}
                            disabled={batch.isStartingBatch || batch.isBatchRunning}
                            className="min-h-32 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 disabled:cursor-not-allowed disabled:opacity-60"
                            spellCheck={false}
                        />
                        {batch.parsedBatchUrls.length > 0 && (
                            <p className="text-xs text-gray-500">
                                {batch.parsedBatchUrls.length === 1 ? t('bulk.urlsHintOne') : t('bulk.urlsHint', { count: batch.parsedBatchUrls.length })}
                            </p>
                        )}
                    </div>
                )}

                {workflow === 'research' && (
                    <ResearchWorkflowPanel
                        namesInput={research.researchNamesInput}
                        parsedNamesCount={research.parsedResearchNames.length}
                        isStarting={research.isStartingResearch}
                        isRunning={research.isResearchRunning}
                        history={research.researchHistory}
                        activeBatchId={research.activeResearchBatchId}
                        isLoadingHistory={research.isLoadingResearchHistory}
                        hasHistoryError={research.researchHistoryError}
                        onNamesInputChange={research.setResearchNamesInput}
                        onSelectBatch={(batchId) => void research.handleSelectResearchBatch(batchId)}
                        onRetryHistory={() => void research.fetchResearchHistory()}
                    />
                )}

                {workflow === 'llmFromFile' && (
                    <>
                        <ImportFileUploadPanel
                            fileUpload={fileUpload}
                            isScraping={isScraping}
                            onClear={onClearUpload}
                        />
                    </>
                )}

                <ImportWorkflowFields
                    workflow={workflow}
                    websiteUrl={websiteUrl}
                    pendingUrlOptions={pendingUrlOptions}
                    sourceMode={sourceMode}
                    selectedModelId={selectedModelId}
                    selectedVisionModelId={selectedVisionModelId}
                    uploadKind={uploadKind}
                    isScraping={isScraping}
                    isStartingBatch={batch.isStartingBatch}
                    isBatchRunning={batch.isBatchRunning}
                    onWebsiteUrlChange={onWebsiteUrlChange}
                    onSourceModeChange={onSourceModeChange}
                    onModelChange={onModelChange}
                    onVisionModelChange={onVisionModelChange}
                />
                <ImportWorkflowControls
                    workflow={workflow}
                    canRun={canRunWorkflow}
                    isScraping={isScraping}
                    isStartingBatch={batch.isStartingBatch}
                    isStartingResearch={research.isStartingResearch}
                    primaryLoadingLabel={primaryLoadingLabel}
                    scrapeMarkdown={scrapeMarkdown}
                    rawModelOutput={rawModelOutput}
                    persistedPipelineRows={persistedPipelineRows}
                    activePipelineSteps={fullPipelineSteps}
                    crawlStepDurationMs={fullPipelineCrawlStepMs}
                    llmStepDurationMs={fullPipelineLlmStepMs}
                    pageStats={pageStats}
                    liveElapsedMs={liveElapsedMs}
                    lastRunDurationMs={lastRunDurationMs}
                    onRun={onRunWorkflow}
                    onDownloadMarkdown={onDownloadMarkdown}
                    onDownloadJson={onDownloadRawModelOutput}
                    onLoadDummyPreview={onLoadDummyPreview}
                    onRestart={onRestart}
                />
            </div>
        </div>
    );
}

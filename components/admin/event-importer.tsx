'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ComboboxOption } from '@/components/ui/combobox';
import { SectionHeader } from '@/components/ui/section-header';
import { cleanUrl } from '@/lib/utils/url';
import {
    OPENROUTER_SCRAPE_MODEL_IDS,
    OPENROUTER_VISION_MODEL_IDS,
} from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';
import { useFileUpload } from '@/hooks/use-file-upload';

import type { PendingEvent } from '@/types/pending-event.types';
import { RaceConflictModal } from '@/components/ui/race-conflict-modal';
import { useModal } from '@/hooks/use-modal';
import type { ConflictingRace } from '@/types/race.types';
import {
    type ScrapeWorkflow,
    type ScrapeSourceMode,
} from '@/components/admin/event-importer/scrape-reducer';
import {
    isValidUrl,
    computeShowImportPreview,
    computePrimaryLoadingLabel,
    computeShowLlmMetricsUi,
} from '@/components/admin/event-importer/workflow-helpers';
import { useFullPipelineTiming } from '@/components/admin/event-importer/use-full-pipeline-timing';
import { useResearchWorkflow } from '@/components/admin/event-importer/use-research-workflow';
import { useBatchImport } from '@/components/admin/event-importer/use-batch-import';
import { useScrapeState } from '@/components/admin/event-importer/use-scrape-state';
import { useScrapeWorkflow } from '@/components/admin/event-importer/use-scrape-workflow';
import { WorkflowForm } from '@/components/admin/event-importer/workflow-form';
import { ImportResults } from '@/components/admin/event-importer/import-results';

interface EventImporterProps {
    pendingEntries: PendingEvent[];
}

export function EventImporter({ pendingEntries }: EventImporterProps) {
    const t = useTranslations('admin.events.import');

    const pendingUrlOptions: ComboboxOption[] = pendingEntries.map((e) => ({
        value: e.url,
        label: cleanUrl(e.url),
    }));

    const [workflow, setWorkflow] = useState<ScrapeWorkflow>('full');
    const [sourceMode, setSourceMode] = useState<ScrapeSourceMode>('crawlSite');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [selectedModelId, setSelectedModelId] = useState<OpenRouterScrapeModelId>(
        OPENROUTER_SCRAPE_MODEL_IDS[0],
    );
    const [selectedVisionModelId, setSelectedVisionModelId] = useState<OpenRouterVisionModelId>(
        OPENROUTER_VISION_MODEL_IDS[0],
    );
    const [importConflicts, setImportConflicts] = useState<ConflictingRace[]>([]);
    const { isOpen: isConflictModalOpen, open: openConflictModal, close: closeConflictModal } = useModal();

    const research = useResearchWorkflow({ t, workflow });

    const scrapeState = useScrapeState();

    const batch = useBatchImport({
        t,
        selectedModelId,
        resetScrapeResults: scrapeState.resetScrapeResults,
        isSavingDraft: scrapeState.isSavingDraft,
        setIsSavingDraft: scrapeState.setIsSavingDraft,
        setImportConflicts,
        openConflictModal,
    });

    const fileUpload = useFileUpload({ onUploadChange: scrapeState.resetScrapeResults });
    const {
        uploadedMarkdown,
        uploadedFileName,
        uploadedImages,
        uploadKind,
    } = fileUpload;

    const scrape = useScrapeWorkflow({
        t,
        workflow,
        sourceMode,
        websiteUrl,
        selectedModelId,
        selectedVisionModelId,
        uploadKind,
        uploadedMarkdown,
        uploadedImages,
        uploadedFileName,
        setImportConflicts,
        openConflictModal,
        scrapeState,
    });

    const {
        isScraping,
        scrapePhase,
        fullPipelineUiActive,
        lastRunDurationMs,
        scrapedEvent,
        scrapedRaces,
        scrapeError,
        scrapeEmptyMessage,
        hasScraped,
        scrapeMarkdown,
        rawModelOutput,
        scrapeUsage,
        spiderUsage,
        pageStats,
        acceptedIndexes,
        acceptingIndex,
        rejectedIndexes,
        jsonView,
        jsonEditorValue,
        jsonEditorError,
        persistedPipelineRows,
        crawlStepStartedAt,
        crawlStepEndedAt,
        llmStepStartedAt,
        llmStepEndedAt,
        liveElapsedMs,
        savedDraftId,
        isSavingDraft,
        isAddingToPending,
        dispatch,
        resetScrapeResults,
        runScrapeWorkflow,
        handleAddToPending,
        handleAccept,
        handleSaveDraft,
        handleReject,
        handleSaveReview,
        handleSwitchToJsonView,
        handleApplyJson,
        handleLoadDummyPreview,
        resetScrapeWorkflow,
        handleDownloadMarkdown,
        handleDownloadRawModelOutput,
    } = scrape;

    const canRunWorkflow =
        !isScraping &&
        (workflow === 'bulk'
            ? batch.canRunBatch
            : workflow === 'research'
                ? research.canRunResearch
            : workflow === 'full' || workflow === 'ingest'
                ? isValidUrl(websiteUrl)
                : uploadKind === 'images'
                    ? uploadedImages.length > 0
                    : Boolean(uploadedMarkdown && uploadedMarkdown.length > 0));

    const handleWorkflowChange = (next: ScrapeWorkflow): void => {
        if (next !== 'full') {
            dispatch({ type: 'PIPELINE_HIDDEN' });
        }
        if (next !== 'bulk') {
            batch.closeBatchReview();
        }
        setWorkflow(next);
        if (next !== 'llmFromFile') {
            fileUpload.clearUpload();
        }
    };

    const handleClearUpload = (): void => {
        fileUpload.clearUpload();
        resetScrapeResults();
    };

    const handleRunWorkflow = async (): Promise<void> => {
        if (workflow === 'bulk') {
            await batch.handleStartBatchImport();
            return;
        }
        if (workflow === 'research') {
            await research.handleStartResearch();
            return;
        }
        await runScrapeWorkflow();
    };

    const handleRestart = (): void => {
        if (isScraping || batch.isStartingBatch || research.isStartingResearch) return;
        setWebsiteUrl('');
        batch.resetBatch();
        research.resetResearch();
        fileUpload.clearUpload();
        resetScrapeWorkflow();
    };

    const showImportPreview = computeShowImportPreview(workflow, isScraping, hasScraped, scrapeError);
    const primaryLoadingLabel = computePrimaryLoadingLabel(t, workflow, scrapePhase);
    const showLlmMetricsUi = computeShowLlmMetricsUi(workflow);

    const { fullPipelineSteps, fullPipelineCrawlStepMs, fullPipelineLlmStepMs } = useFullPipelineTiming({
        workflow,
        fullPipelineUiActive,
        isScraping,
        hasScraped,
        scrapePhase,
        scrapeError,
        scrapeMarkdown,
        liveElapsedMs,
        crawlStepStartedAt,
        crawlStepEndedAt,
        llmStepStartedAt,
        llmStepEndedAt,
    });

    return (
        <div className="flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />
            <WorkflowForm
                t={t}
                workflow={workflow}
                sourceMode={sourceMode}
                websiteUrl={websiteUrl}
                pendingUrlOptions={pendingUrlOptions}
                selectedModelId={selectedModelId}
                selectedVisionModelId={selectedVisionModelId}
                isScraping={isScraping}
                canRunWorkflow={canRunWorkflow}
                batch={batch}
                research={research}
                fileUpload={fileUpload}
                primaryLoadingLabel={primaryLoadingLabel}
                scrapeMarkdown={scrapeMarkdown}
                rawModelOutput={rawModelOutput}
                persistedPipelineRows={persistedPipelineRows}
                fullPipelineSteps={fullPipelineSteps}
                fullPipelineCrawlStepMs={fullPipelineCrawlStepMs}
                fullPipelineLlmStepMs={fullPipelineLlmStepMs}
                pageStats={pageStats}
                liveElapsedMs={liveElapsedMs}
                lastRunDurationMs={lastRunDurationMs}
                onWorkflowChange={handleWorkflowChange}
                onWebsiteUrlChange={setWebsiteUrl}
                onSourceModeChange={setSourceMode}
                onModelChange={setSelectedModelId}
                onVisionModelChange={setSelectedVisionModelId}
                onClearUpload={handleClearUpload}
                onRunWorkflow={() => void handleRunWorkflow()}
                onDownloadMarkdown={handleDownloadMarkdown}
                onDownloadRawModelOutput={handleDownloadRawModelOutput}
                onLoadDummyPreview={handleLoadDummyPreview}
                onRestart={handleRestart}
            />
            <ImportResults
                t={t}
                workflow={workflow}
                batch={batch}
                research={research}
                dispatch={dispatch}
                showLlmMetricsUi={showLlmMetricsUi}
                hasScraped={hasScraped}
                isScraping={isScraping}
                scrapeError={scrapeError}
                scrapeUsage={scrapeUsage}
                spiderUsage={spiderUsage}
                jsonView={jsonView}
                showImportPreview={showImportPreview}
                scrapedEvent={scrapedEvent}
                scrapedRaces={scrapedRaces}
                scrapeEmptyMessage={scrapeEmptyMessage}
                acceptedIndexes={acceptedIndexes}
                acceptingIndex={acceptingIndex}
                rejectedIndexes={rejectedIndexes}
                isAddingToPending={isAddingToPending}
                isSavingDraft={isSavingDraft}
                savedDraftId={savedDraftId}
                jsonEditorValue={jsonEditorValue}
                jsonEditorError={jsonEditorError}
                onSwitchToJsonView={handleSwitchToJsonView}
                onAddToPending={handleAddToPending}
                onAccept={handleAccept}
                onReject={handleReject}
                onSaveReview={handleSaveReview}
                onSaveDraft={handleSaveDraft}
                onApplyJson={handleApplyJson}
            />
            <RaceConflictModal
                isOpen={isConflictModalOpen}
                onClose={closeConflictModal}
                conflicts={importConflicts}
            />
        </div>
    );
}

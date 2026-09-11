'use client';

import type { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { TabSwitcher } from '@/components/ui/tab-switcher';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import { ImportJsonEditor } from '@/components/admin/import-json-editor';
import { ImportCostSummary } from '@/components/admin/import-cost-summary';
import { BulkProcessTable } from '@/components/admin/bulk-process-table';
import type { ScrapeAction, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';
import type { useBatchImport } from '@/components/admin/event-importer/use-batch-import';
import type { useResearchWorkflow } from '@/components/admin/event-importer/use-research-workflow';
import type { TrailEventAgentEvent, TrailEventAgentRace } from '@/types/trail-event-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { ScrapeUsage } from '@/types/races-scrape-api.types';

interface ImportResultsProps {
    t: ReturnType<typeof useTranslations>;
    workflow: ScrapeWorkflow;
    batch: ReturnType<typeof useBatchImport>;
    research: ReturnType<typeof useResearchWorkflow>;
    dispatch: (action: ScrapeAction) => void;
    showLlmMetricsUi: boolean;
    hasScraped: boolean;
    isScraping: boolean;
    scrapeError: string | null;
    scrapeUsage: OpenRouterScrapeUsage | null;
    spiderUsage: ScrapeUsage | null;
    jsonView: boolean;
    showImportPreview: boolean;
    scrapedEvent: TrailEventAgentEvent | null;
    scrapedRaces: TrailEventAgentRace[];
    scrapeEmptyMessage: string | null;
    acceptedIndexes: Set<number>;
    acceptingIndex: number | null;
    rejectedIndexes: Set<number>;
    isAddingToPending: boolean;
    isSavingDraft: boolean;
    savedDraftId: string | null;
    jsonEditorValue: string;
    jsonEditorError: string | null;
    onSwitchToJsonView: () => void;
    onAddToPending: () => Promise<void>;
    onAccept: () => Promise<void>;
    onReject: () => void;
    onSaveReview: (event: TrailEventAgentEvent, races: TrailEventAgentRace[]) => void;
    onSaveDraft: (event: TrailEventAgentEvent, races: TrailEventAgentRace[]) => Promise<void>;
    onApplyJson: () => void;
}

export function ImportResults({
    t,
    workflow,
    batch,
    research,
    dispatch,
    showLlmMetricsUi,
    hasScraped,
    isScraping,
    scrapeError,
    scrapeUsage,
    spiderUsage,
    jsonView,
    showImportPreview,
    scrapedEvent,
    scrapedRaces,
    scrapeEmptyMessage,
    acceptedIndexes,
    acceptingIndex,
    rejectedIndexes,
    isAddingToPending,
    isSavingDraft,
    savedDraftId,
    jsonEditorValue,
    jsonEditorError,
    onSwitchToJsonView,
    onAddToPending,
    onAccept,
    onReject,
    onSaveReview,
    onSaveDraft,
    onApplyJson,
}: ImportResultsProps) {
    return (
        <>
            {showLlmMetricsUi &&
                hasScraped &&
                scrapeError === null &&
                scrapeUsage !== null && (
                    <ImportCostSummary
                        openRouterUsage={scrapeUsage}
                        scrapeUsage={spiderUsage}
                        translationsNamespace="admin.events.import"
                    />
                )}
            {showLlmMetricsUi && hasScraped && !isScraping && scrapeError === null && (
                <TabSwitcher
                    tabs={[
                        { id: 'races', label: t('racesTab') },
                        { id: 'json', label: t('jsonTab') },
                    ]}
                    activeId={jsonView ? 'json' : 'races'}
                    onChange={(id) =>
                        id === 'json'
                            ? onSwitchToJsonView()
                            : dispatch({ type: 'JSON_TAB_CLOSED' })
                    }
                    className="self-start"
                />
            )}
            {showImportPreview && !jsonView && (
                <EventImportPreview
                    event={scrapedEvent}
                    races={scrapedRaces}
                    isLoading={isScraping}
                    error={scrapeError}
                    emptyMessage={scrapeEmptyMessage}
                    emptyAction={
                        scrapeEmptyMessage != null ? (
                            <Button
                                variant="secondary"
                                onClick={onAddToPending}
                                isLoading={isAddingToPending}
                                loadingText={t('results.addToPendingLoading')}
                            >
                                {t('results.addToPendingButton')}
                            </Button>
                        ) : undefined
                    }
                    onAccept={onAccept}
                    isAccepted={acceptedIndexes.has(0)}
                    isAccepting={acceptingIndex === 0}
                    onReject={onReject}
                    isRejected={rejectedIndexes.has(0)}
                    onSaveReview={onSaveReview}
                    onSaveDraft={onSaveDraft}
                    isSavingDraft={isSavingDraft}
                    isDraftSaved={savedDraftId !== null}
                />
            )}
            {workflow === 'bulk' && batch.batchRows.length > 0 && (
                <div>
                    {batch.batchSnapshot && (
                        <p className="mb-2 text-xs text-gray-500">
                            {t('bulk.statusSummary', {
                                completed: batch.batchSnapshot.summary.completed,
                                failed: batch.batchSnapshot.summary.failed,
                            })}
                        </p>
                    )}
                    <BulkProcessTable
                        rows={batch.batchRows}
                        translationsNamespace="admin.events.import.bulk"
                        viewingRowId={batch.viewingBatchItemId}
                        onViewResult={(itemId) => {
                            void batch.handleViewBatchResult(itemId);
                        }}
                    />
                </div>
            )}
            {workflow === 'research' && research.researchRows.length > 0 && (
                <div>
                    {research.researchSnapshot ? (
                        <p className="mb-2 text-xs text-gray-500">
                            {t('research.statusSummary', {
                                completed: research.researchSnapshot.summary.completed,
                                failed: research.researchSnapshot.summary.failed,
                                total: research.researchSnapshot.summary.total,
                            })}
                        </p>
                    ) : null}
                    <BulkProcessTable
                        rows={research.researchRows}
                        translationsNamespace="admin.events.import.research"
                        primaryColumnKey="eventName"
                        retryingRowId={research.retryingResearchItemId}
                        onRetry={(itemId) => {
                            void research.handleRetryResearchItem(itemId);
                        }}
                    />
                </div>
            )}
            <EventImportPreviewModal
                isOpen={batch.reviewingBatchResult !== null && batch.reviewingBatchItem !== null}
                closeLabel={t('bulk.closePreview')}
                onClose={batch.closeBatchReview}
            >
                {batch.reviewingBatchResult && batch.reviewingBatchItem ? (
                    <EventImportPreview
                        event={batch.reviewingBatchResult.event}
                        races={batch.reviewingBatchResult.races}
                        isLoading={false}
                        error={null}
                        onAccept={batch.handleAcceptBatchItem}
                        isAccepted={batch.reviewingBatchItem.reviewStatus === 'accepted'}
                        isAccepting={batch.isAcceptingBatchItem}
                        onReject={() => undefined}
                        isRejected={false}
                        showReject={false}
                        onSaveReview={batch.handleSaveBatchReview}
                        onSaveDraft={batch.handleSaveBatchDraft}
                        isSavingDraft={isSavingDraft}
                        isDraftSaved={batch.savedBatchDraftId !== null || batch.reviewingBatchItem.savedDraftId !== null}
                    />
                ) : null}
            </EventImportPreviewModal>
            {workflow !== 'bulk' && workflow !== 'research' && jsonView && hasScraped && !isScraping && scrapeError === null && (
                <ImportJsonEditor
                    value={jsonEditorValue}
                    error={jsonEditorError}
                    applyLabel={t('applyJson')}
                    cancelLabel={t('cancelJson')}
                    onChange={(value) => dispatch({ type: 'JSON_EDITED', value })}
                    onApply={onApplyJson}
                    onCancel={() => dispatch({ type: 'JSON_TAB_CLOSED' })}
                />
            )}
        </>
    );
}

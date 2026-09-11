'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import type { ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { TabSwitcher } from '@/components/ui/tab-switcher';
import { SectionHeader } from '@/components/ui/section-header';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import { ImportJsonEditor } from '@/components/admin/import-json-editor';
import { ImportFileUploadPanel } from '@/components/admin/import-file-upload-panel';
import { ImportWorkflowFields } from '@/components/admin/import-workflow-fields';
import { ImportWorkflowControls } from '@/components/admin/import-workflow-controls';
import { ResearchWorkflowPanel } from '@/components/admin/research-workflow-panel';
import { ImportCostSummary } from '@/components/admin/import-cost-summary';
import { cleanUrl } from '@/lib/utils/url';
import {
    DUMMY_CRAWL_PAGE_STATS,
    DUMMY_LAST_RUN_DURATION_MS,
    DUMMY_EVENT_RAW_MODEL_OUTPUT,
    DUMMY_SCRAPE_MARKDOWN,
    DUMMY_SCRAPE_USAGE,
    DUMMY_SPIDER_USAGE,
    DUMMY_SCRAPED_EVENT,
    DUMMY_SCRAPED_EVENT_RACES,
} from '@/components/admin/scrape-preview.mock';
import { BulkProcessTable } from '@/components/admin/bulk-process-table';
import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';
import {
    runTrailEventAgent,
    runEventImport,
    acceptScrapedEvent,
    acceptEventImportItem,
    saveEventImportDraft,
    startEventImportBatch,
    getEventImportBatchStatus,
    getEventImportItemResult,
    updateEventImportItemResult,
} from '@/lib/api/events';
import {
    OPENROUTER_SCRAPE_MODEL_IDS,
    OPENROUTER_VISION_MODEL_IDS,
} from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';
import { triggerDownload } from '@/lib/utils/download';
import { useLiveTimer } from '@/hooks/use-live-timer';
import { useFileUpload } from '@/hooks/use-file-upload';

import { normalizeUrl } from '@/lib/validation';
import type { EventImportBatchSnapshot, EventImportResult, EventImportWorkflow } from '@/types/events-import-api.types';
import type {
    TrailEventAgentEvent,
    TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
import type { PendingEvent } from '@/types/pending-event.types';
import { addPendingEvents } from '@/lib/api/pending-events';
import { RaceConflictModal } from '@/components/ui/race-conflict-modal';
import { useModal } from '@/hooks/use-modal';
import type { ConflictingRace } from '@/types/race.types';
import { Sparkles } from 'lucide-react';
import {
    type ScrapeWorkflow,
    type ScrapeSourceMode,
    initialScrapeState,
    scrapeReducer,
} from '@/components/admin/event-importer/scrape-reducer';
import {
    isValidUrl,
    findStep,
} from '@/components/admin/event-importer/workflow-helpers';
import {
    computeFullPipelineSteps,
    computeFullPipelineCrawlStepMs,
    computeFullPipelineLlmStepMs,
} from '@/components/admin/event-importer/full-pipeline-steps';
import { computeBatchRows } from '@/components/admin/event-importer/bulk-process-rows';
import { useResearchWorkflow } from '@/components/admin/event-importer/use-research-workflow';

interface EventImporterProps {
    pendingEntries: PendingEvent[];
}

export function EventImporter({ pendingEntries }: EventImporterProps) {
    const t = useTranslations('admin.events.import');

    const pendingUrlOptions: ComboboxOption[] = pendingEntries.map((e) => ({
        value: e.url,
        label: cleanUrl(e.url),
    }));

    const crawlStartedAtRef = useRef<number | null>(null);
    const crawlEndedAtRef = useRef<number | null>(null);
    const llmStartedAtRef = useRef<number | null>(null);
    const llmEndedAtRef = useRef<number | null>(null);

    const [workflow, setWorkflow] = useState<ScrapeWorkflow>('full');
    const [sourceMode, setSourceMode] = useState<ScrapeSourceMode>('crawlSite');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [selectedModelId, setSelectedModelId] = useState<OpenRouterScrapeModelId>(
        OPENROUTER_SCRAPE_MODEL_IDS[0],
    );
    const [selectedVisionModelId, setSelectedVisionModelId] = useState<OpenRouterVisionModelId>(
        OPENROUTER_VISION_MODEL_IDS[0],
    );
    const [batchUrlsInput, setBatchUrlsInput] = useState('');
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [batchSnapshot, setBatchSnapshot] = useState<EventImportBatchSnapshot | null>(null);
    const [isStartingBatch, setIsStartingBatch] = useState(false);
    const [viewingBatchItemId, setViewingBatchItemId] = useState<string | null>(null);
    const [reviewingBatchItemId, setReviewingBatchItemId] = useState<string | null>(null);
    const [reviewingBatchResult, setReviewingBatchResult] = useState<EventImportResult | null>(null);
    const [isAcceptingBatchItem, setIsAcceptingBatchItem] = useState(false);
    const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
    const [savedBatchDraftId, setSavedBatchDraftId] = useState<string | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isAddingToPending, setIsAddingToPending] = useState(false);
    const fetchedBatchItemIds = useRef<Set<string>>(new Set());
    const [importConflicts, setImportConflicts] = useState<ConflictingRace[]>([]);
    const { isOpen: isConflictModalOpen, open: openConflictModal, close: closeConflictModal } = useModal();

    const research = useResearchWorkflow({ t, workflow });

    const [state, dispatch] = useReducer(scrapeReducer, initialScrapeState);
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
    } = state;

    const { elapsedMs: liveElapsedMs, startedAtRef: runStartedAtRef } = useLiveTimer(isScraping);

    const resetScrapeResults = (): void => {
        setSavedDraftId(null);
        dispatch({ type: 'RESULTS_CLEARED' });
    };

    const closeBatchReview = useCallback((): void => {
        setReviewingBatchItemId(null);
        setReviewingBatchResult(null);
    }, []);

    const handleAddToPending = async (): Promise<void> => {
        if (isAddingToPending || !websiteUrl) return;
        setIsAddingToPending(true);
        try {
            const result = await addPendingEvents([normalizeUrl(websiteUrl)]);
            if (result.skipped.length > 0 && result.added.length === 0) {
                toast.success(t('addToPendingAlready'));
            } else {
                toast.success(t('addToPendingSuccess'));
            }
        } catch {
            toast.error(t('addToPendingError'));
        } finally {
            setIsAddingToPending(false);
        }
    };

    const fileUpload = useFileUpload({ onUploadChange: resetScrapeResults });
    const {
        uploadedMarkdown,
        uploadedFileName,
        uploadedImages,
        uploadKind,
    } = fileUpload;

    const parsedBatchUrls = useMemo((): string[] => {
        const urls = batchUrlsInput
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean)
            .map(normalizeUrl);

        return Array.from(new Set(urls));
    }, [batchUrlsInput]);

    const isBatchRunning =
        batchSnapshot?.batch.status === 'pending' || batchSnapshot?.batch.status === 'running';

    const canRunBatch =
        parsedBatchUrls.length > 0 &&
        parsedBatchUrls.every(isValidUrl) &&
        !isStartingBatch &&
        !isBatchRunning;

    const canRunWorkflow =
        !isScraping &&
        (workflow === 'bulk'
            ? canRunBatch
            : workflow === 'research'
                ? research.canRunResearch
            : workflow === 'full' || workflow === 'ingest'
                ? isValidUrl(websiteUrl)
                : uploadKind === 'images'
                    ? uploadedImages.length > 0
                    : Boolean(uploadedMarkdown && uploadedMarkdown.length > 0));

    const clearFullPipelineStepRefs = (): void => {
        crawlStartedAtRef.current = null;
        crawlEndedAtRef.current = null;
        llmStartedAtRef.current = null;
        llmEndedAtRef.current = null;
    };

    const handleWorkflowChange = (next: ScrapeWorkflow): void => {
        if (next !== 'full') {
            dispatch({ type: 'PIPELINE_HIDDEN' });
            clearFullPipelineStepRefs();
        }
        if (next !== 'bulk') {
            closeBatchReview();
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

    const resolveImportWorkflow = (): EventImportWorkflow | null => {
        if (workflow === 'full') {
            return sourceMode === 'crawlSite' ? 'crawlSiteExtract' : 'scrapePageExtract';
        }
        if (workflow === 'ingest') return sourceMode;
        return null;
    };

    const setCompletedImportStepRefs = (result: EventImportResult): void => {
        const crawlStep = findStep(result.steps, 'crawlSite') ?? findStep(result.steps, 'scrapePage');
        const extractStep = findStep(result.steps, 'extract');

        crawlStartedAtRef.current = crawlStep ? 0 : null;
        crawlEndedAtRef.current = crawlStep ? crawlStep.durationMs : null;
        llmStartedAtRef.current = extractStep ? 0 : null;
        llmEndedAtRef.current = extractStep ? extractStep.durationMs : null;
    };

    const fetchBatchStatus = useCallback(async (batchId: string): Promise<EventImportBatchSnapshot> => {
        const data = await getEventImportBatchStatus(batchId);
        setBatchSnapshot(data);
        return data;
    }, []);

    const handleStartBatchImport = async (): Promise<void> => {
        setIsStartingBatch(true);
        setBatchSnapshot(null);
        setActiveBatchId(null);
        closeBatchReview();
        resetScrapeResults();

        try {
            const result = await startEventImportBatch({
                urls: parsedBatchUrls,
                model: selectedModelId,
            });

            if (!result.ok) {
                setImportConflicts(result.conflicts);
                openConflictModal();
                return;
            }

            setActiveBatchId(result.data.batchId);
            await fetchBatchStatus(result.data.batchId);
            toast.success(parsedBatchUrls.length === 1 ? t('bulk.startSuccessOne') : t('bulk.startSuccess', { count: parsedBatchUrls.length }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('bulk.runError');
            toast.error(errorMessage);
        } finally {
            setIsStartingBatch(false);
        }
    };

    const handleRunWorkflow = async () => {
        if (workflow === 'bulk') {
            await handleStartBatchImport();
            return;
        }
        if (workflow === 'research') {
            await research.handleStartResearch();
            return;
        }

        setSavedDraftId(null);
        runStartedAtRef.current = performance.now();

        try {
            const importWorkflow = resolveImportWorkflow();
            if (importWorkflow !== null) {
                const normalizedUrl = normalizeUrl(websiteUrl.trim());

                if (workflow === 'full') {
                    dispatch({ type: 'CRAWL_SITE_EXTRACT_START' });
                    crawlStartedAtRef.current = performance.now();
                    crawlEndedAtRef.current = null;
                    llmStartedAtRef.current = null;
                    llmEndedAtRef.current = null;
                } else {
                    dispatch({ type: 'SCRAPE_START' });
                    clearFullPipelineStepRefs();
                }

                const result = await runEventImport(
                    importWorkflow === 'crawlSite' || importWorkflow === 'scrapePage'
                        ? { workflow: importWorkflow, websiteUrl: normalizedUrl }
                        : { workflow: importWorkflow, websiteUrl: normalizedUrl, model: selectedModelId },
                );

                if (!result.ok) {
                    if ('reason' in result) {
                        const errorMessage = result.reason === 'markdown_too_long'
                            ? t('markdownTooLong')
                            : t('markdownTooShort');
                        dispatch({ type: 'SCRAPE_ERROR', error: errorMessage, markdown: result.markdown });
                        toast.error(errorMessage);
                        return;
                    }
                    setImportConflicts(result.conflicts);
                    openConflictModal();
                    dispatch({ type: 'WORKFLOW_RESET' });
                    return;
                }

                setCompletedImportStepRefs(result.data);
                dispatch({
                    type: 'IMPORT_SUCCESS',
                    result: result.data,
                    persistedRows: [],
                    showPipeline: workflow === 'full',
                });
                return;
            }

            if (workflow === 'llmFromFile') {
                if (uploadKind === 'images') {
                    if (uploadedImages.length === 0) return;
                    const result = await runTrailEventAgent({
                        mode: 'images',
                        images: uploadedImages.map(img => img.dataUrl),
                        model: selectedVisionModelId,
                    });
                    if (!result.ok) throw new Error(t('scrapeError'));
                    dispatch({ type: 'AGENT_SUCCESS', event: result.data.event, races: result.data.races, errorMessage: result.data.errorMessage, rawModelOutput: result.data.rawModelOutput, usage: result.data.usage });
                } else {
                    const markdownBody = uploadedMarkdown;
                    if (!markdownBody) return;
                    const result = await runTrailEventAgent({
                        mode: 'markdown',
                        markdown: markdownBody,
                        model: selectedModelId,
                    });
                    if (!result.ok) {
                        const errorMessage = result.reason === 'markdown_too_long'
                            ? t('markdownTooLong')
                            : t('markdownTooShort');
                        dispatch({ type: 'SCRAPE_ERROR', error: errorMessage, markdown: result.markdown });
                        toast.error(errorMessage);
                        return;
                    }
                    dispatch({ type: 'AGENT_SUCCESS', event: result.data.event, races: result.data.races, errorMessage: result.data.errorMessage, rawModelOutput: result.data.rawModelOutput, usage: result.data.usage, markdown: result.data.markdown });
                }
            }
        } catch (err) {
            const isTimeout = err instanceof Error && err.message === 'timeout';
            const errorMessage = isTimeout ? t('scrapeTimeout') : t('scrapeError');
            dispatch({ type: 'SCRAPE_ERROR', error: errorMessage });
            toast.error(errorMessage);
        } finally {
            if (
                llmStartedAtRef.current !== null &&
                llmEndedAtRef.current === null
            ) {
                llmEndedAtRef.current = performance.now();
            }
            const startedAt = runStartedAtRef.current;
            const durationMs =
                startedAt !== null ? Math.round(performance.now() - startedAt) : 0;
            dispatch({ type: 'SCRAPE_COMPLETE', durationMs });
            runStartedAtRef.current = null;
        }
    };

    useEffect(() => {
        if (!activeBatchId || !batchSnapshot) {
            return;
        }

        if (batchSnapshot.batch.status !== 'pending' && batchSnapshot.batch.status !== 'running') {
            return;
        }

        const intervalId = window.setInterval(() => {
            void fetchBatchStatus(activeBatchId).catch((error) => {
                console.error('Race import batch polling error:', error);
                toast.error(t('bulk.pollError'));
                setActiveBatchId(null);
            });
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, [activeBatchId, batchSnapshot, fetchBatchStatus, t]);

    useEffect(() => {
        if (!batchSnapshot || isBatchRunning) return;

        const completedItems = batchSnapshot.items.filter(
            (item) => item.status === 'completed' && !fetchedBatchItemIds.current.has(item.id),
        );
        if (completedItems.length === 0) return;

        const itemIds = completedItems.map((item) => item.id);
        itemIds.forEach((id) => fetchedBatchItemIds.current.add(id));
    }, [batchSnapshot, isBatchRunning]);

    const handleViewBatchResult = async (itemId: string): Promise<void> => {
        setSavedBatchDraftId(null);
        setViewingBatchItemId(itemId);

        try {
            const result = await getEventImportItemResult(itemId);
            setReviewingBatchResult(result);
            setReviewingBatchItemId(itemId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('bulk.resultError');
            toast.error(errorMessage);
        } finally {
            setViewingBatchItemId(null);
        }
    };

    const handleAccept = async () => {
        if (!scrapedEvent) return;
        dispatch({ type: 'ACCEPTING_INDEX', index: 0 });
        try {
            const reviewedWebsiteUrl = websiteUrl.trim();
            await acceptScrapedEvent(
                {
                    ...scrapedEvent,
                    websiteUrl: reviewedWebsiteUrl
                        ? normalizeUrl(reviewedWebsiteUrl)
                        : scrapedEvent.websiteUrl,
                },
                scrapedRaces,
            );
            dispatch({ type: 'RACE_ACCEPT', index: 0 });
            toast.success(t('results.acceptSuccess'));
        } catch (err) {
            const errorMessage = err instanceof Error
                ? err.message
                : t('results.acceptError');
            toast.error(errorMessage);
        } finally {
            dispatch({ type: 'ACCEPTING_INDEX', index: null });
        }
    };

    const handleSaveDraft = async (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): Promise<void> => {
        if (isSavingDraft || savedDraftId) return;
        setIsSavingDraft(true);
        try {
            const sourceUrl = websiteUrl.trim()
                ? normalizeUrl(websiteUrl.trim())
                : event.websiteUrl;
            const draft = await saveEventImportDraft({ event, races, sourceUrl });
            setSavedDraftId(draft.id);
            toast.success(t('results.draftSaved'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('results.draftSaveError'));
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleReject = (): void => {
        dispatch({ type: 'EVENT_REJECT' });
        toast.success(t('results.reviewRejected'));
    };

    const handleSaveReview = (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): void => {
        dispatch({ type: 'REVIEW_EDITED', event, races });
    };

    const handleAcceptBatchItem = async (): Promise<void> => {
        if (!reviewingBatchItemId || isAcceptingBatchItem) return;

        setIsAcceptingBatchItem(true);

        try {
            const { eventId, eventSlug } = await acceptEventImportItem(reviewingBatchItemId);
            const updatedAt = new Date().toISOString();

            setBatchSnapshot((current) => {
                if (!current) return current;

                return {
                    ...current,
                    items: current.items.map((item) =>
                        item.id === reviewingBatchItemId
                            ? {
                                ...item,
                                reviewStatus: 'accepted',
                                acceptedEventId: eventId,
                                acceptedEventSlug: eventSlug,
                                reviewedAt: updatedAt,
                                updatedAt,
                            }
                            : item,
                    ),
                };
            });
            closeBatchReview();
            toast.success(t('results.acceptSuccess'));
        } catch {
            toast.error(t('bulk.acceptError'));
        } finally {
            setIsAcceptingBatchItem(false);
        }
    };

    const handleSaveBatchReview = async (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): Promise<void> => {
        if (!reviewingBatchItemId) return;

        try {
            const result = await updateEventImportItemResult(
                reviewingBatchItemId,
                { event, races },
            );
            setReviewingBatchResult(result);
            setBatchSnapshot((current) => {
                if (!current) return current;

                const updatedAt = new Date().toISOString();
                return {
                    ...current,
                    items: current.items.map((item) =>
                        item.id === reviewingBatchItemId
                            ? {
                                ...item,
                                raceCount: result.races.length,
                                updatedAt,
                            }
                            : item,
                    ),
                };
            });
            toast.success(t('bulk.reviewSaveSuccess'));
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : t('bulk.reviewSaveError'),
            );
            throw error;
        }
    };

    const handleSaveBatchDraft = async (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): Promise<void> => {
        if (!reviewingBatchItem || isSavingDraft || savedBatchDraftId) return;
        setIsSavingDraft(true);
        try {
            const draft = await saveEventImportDraft({
                event,
                races,
                sourceUrl: reviewingBatchItem.url,
                batchItemId: reviewingBatchItem.id,
            });
            setSavedBatchDraftId(draft.id);
            setBatchSnapshot((current) => current ? {
                ...current,
                items: current.items.map((item) => item.id === reviewingBatchItem.id
                    ? { ...item, savedDraftId: draft.id }
                    : item),
            } : current);
            toast.success(t('results.draftSaved'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('results.draftSaveError'));
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSwitchToJsonView = (): void => {
        dispatch({
            type: 'JSON_TAB_OPENED',
            value: JSON.stringify({
                event: scrapedEvent,
                races: scrapedRaces,
                errorMessage: scrapeEmptyMessage,
            }, null, 2),
        });
    };

    const handleApplyJson = (): void => {
        try {
            const parsed = JSON.parse(jsonEditorValue);
            if (
                typeof parsed !== 'object' ||
                parsed === null ||
                !('event' in parsed) ||
                !Array.isArray((parsed as { races?: unknown }).races)
            ) {
                dispatch({ type: 'JSON_PARSE_FAILED', error: t('jsonNotArrayError') });
                return;
            }
            const payload = parsed as {
                event: TrailEventAgentEvent | null;
                races: TrailEventAgentRace[];
                errorMessage?: string | null;
            };
            dispatch({
                type: 'JSON_IMPORTED',
                event: payload.event,
                races: payload.races,
                errorMessage: payload.errorMessage ?? null,
            });
        } catch (err) {
            dispatch({ type: 'JSON_PARSE_FAILED', error: err instanceof Error ? err.message : t('jsonParseError') });
        }
    };

    const handleLoadDummyPreview = (): void => {
        clearFullPipelineStepRefs();
        runStartedAtRef.current = null;
        const isMarkdownOnly = workflow === 'ingest';
        dispatch({
            type: 'PREVIEW_LOADED',
            durationMs: DUMMY_LAST_RUN_DURATION_MS,
            scrapedEvent: isMarkdownOnly ? null : DUMMY_SCRAPED_EVENT,
            scrapedRaces: isMarkdownOnly ? [] : [...DUMMY_SCRAPED_EVENT_RACES],
            emptyMessage: isMarkdownOnly ? t('results.noResults') : null,
            markdown: DUMMY_SCRAPE_MARKDOWN,
            rawModelOutput: isMarkdownOnly ? null : DUMMY_EVENT_RAW_MODEL_OUTPUT,
            usage: isMarkdownOnly ? null : { ...DUMMY_SCRAPE_USAGE },
            spiderUsage: workflow === 'llmFromFile' ? null : { ...DUMMY_SPIDER_USAGE },
            pageStats: workflow === 'llmFromFile' ? null : { ...DUMMY_CRAWL_PAGE_STATS },
            showPipeline: workflow === 'full',
        });
    };

    const handleRestart = (): void => {
        if (isScraping || isStartingBatch || research.isStartingResearch) return;
        setWebsiteUrl('');
        setBatchUrlsInput('');
        setActiveBatchId(null);
        setBatchSnapshot(null);
        research.resetResearch();
        setViewingBatchItemId(null);
        setSavedDraftId(null);
        setSavedBatchDraftId(null);
        closeBatchReview();
        fetchedBatchItemIds.current.clear();
        fileUpload.clearUpload();
        runStartedAtRef.current = null;
        clearFullPipelineStepRefs();
        dispatch({ type: 'WORKFLOW_RESET' });
    };

    const handleDownloadMarkdown = () => {
        if (!scrapeMarkdown) return;
        let downloadName: string;
        if (workflow === 'llmFromFile' && uploadKind === 'markdown' && uploadedFileName) {
            downloadName = uploadedFileName;
        } else {
            const hostname = new URL(normalizeUrl(websiteUrl.trim())).hostname.replace(/^www\./, '');
            downloadName = `crawl-${hostname}.md`;
        }
        triggerDownload(scrapeMarkdown, downloadName, 'text/markdown');
    };

    const handleDownloadRawModelOutput = (): void => {
        if (rawModelOutput === null || rawModelOutput === '') return;
        triggerDownload(rawModelOutput, `model-raw-${Date.now()}.json`, 'application/json;charset=utf-8');
    };

    const showImportPreview =
        workflow === 'bulk' || workflow === 'research'
            ? false
            : workflow !== 'ingest'
            ? isScraping || hasScraped
            : hasScraped && scrapeError !== null;

    const primaryLoadingLabel =
        workflow === 'ingest'
            ? t('crawlingMarkdown')
            : workflow === 'bulk'
                ? t('bulk.running')
                : workflow === 'research'
                    ? t('research.running')
                : workflow === 'full' && scrapePhase === 'crawling'
                    ? t('crawlingMarkdown')
                    : t('scraping');

    const showLlmMetricsUi = workflow !== 'ingest' && workflow !== 'bulk' && workflow !== 'research';

    const fullPipelineSteps = useMemo(
        () =>
            computeFullPipelineSteps({
                workflow,
                fullPipelineUiActive,
                isScraping,
                hasScraped,
                scrapePhase,
                scrapeError,
                scrapeMarkdown,
            }),
        [
            workflow,
            fullPipelineUiActive,
            isScraping,
            hasScraped,
            scrapePhase,
            scrapeError,
            scrapeMarkdown,
        ],
    );

    const fullPipelineCrawlStepMs = useMemo(() => {
        // Keep this memo recalculating on the live timer tick while crawling is active.
        void liveElapsedMs;
        return computeFullPipelineCrawlStepMs({
            workflow,
            fullPipelineUiActive,
            isScraping,
            scrapePhase,
            startedAt: crawlStartedAtRef.current,
            endedAt: crawlEndedAtRef.current,
        });
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs]);

    const fullPipelineLlmStepMs = useMemo(() => {
        // Keep this memo recalculating on the live timer tick while LLM extraction is active.
        void liveElapsedMs;
        return computeFullPipelineLlmStepMs({
            workflow,
            fullPipelineUiActive,
            isScraping,
            scrapePhase,
            startedAt: llmStartedAtRef.current,
            endedAt: llmEndedAtRef.current,
        });
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs]);

    const batchRows = useMemo(
        (): BulkProcessTableRow[] => computeBatchRows(batchSnapshot),
        [batchSnapshot],
    );

    const reviewingBatchItem = reviewingBatchItemId
        ? batchSnapshot?.items.find((item) => item.id === reviewingBatchItemId) ?? null
        : null;

    return (
        <div className="flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />
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
                        onChange={(id) => handleWorkflowChange(id as ScrapeWorkflow)}
                        disabled={isScraping || isStartingBatch || research.isStartingResearch}
                    />

                    {workflow === 'bulk' && (
                        <div className="grid gap-2 w-full max-w-xl">
                            <label htmlFor="batchUrls" className="text-sm font-medium leading-none text-gray-900">
                                {t('bulk.urlsLabel')}
                            </label>
                            <textarea
                                id="batchUrls"
                                value={batchUrlsInput}
                                onChange={(event) => setBatchUrlsInput(event.target.value)}
                                placeholder={t('bulk.urlsPlaceholder')}
                                disabled={isStartingBatch || isBatchRunning}
                                className="min-h-32 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 disabled:cursor-not-allowed disabled:opacity-60"
                                spellCheck={false}
                            />
                            {parsedBatchUrls.length > 0 && (
                                <p className="text-xs text-gray-500">
                                    {parsedBatchUrls.length === 1 ? t('bulk.urlsHintOne') : t('bulk.urlsHint', { count: parsedBatchUrls.length })}
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
                                onClear={handleClearUpload}
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
                        isStartingBatch={isStartingBatch}
                        isBatchRunning={isBatchRunning}
                        onWebsiteUrlChange={setWebsiteUrl}
                        onSourceModeChange={setSourceMode}
                        onModelChange={setSelectedModelId}
                        onVisionModelChange={setSelectedVisionModelId}
                    />
                    <ImportWorkflowControls
                        workflow={workflow}
                        canRun={canRunWorkflow}
                        isScraping={isScraping}
                        isStartingBatch={isStartingBatch}
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
                        onRun={handleRunWorkflow}
                        onDownloadMarkdown={handleDownloadMarkdown}
                        onDownloadJson={handleDownloadRawModelOutput}
                        onLoadDummyPreview={handleLoadDummyPreview}
                        onRestart={handleRestart}
                    />
                </div>
            </div>
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
                            ? handleSwitchToJsonView()
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
                                onClick={handleAddToPending}
                                isLoading={isAddingToPending}
                                loadingText={t('results.addToPendingLoading')}
                            >
                                {t('results.addToPendingButton')}
                            </Button>
                        ) : undefined
                    }
                    onAccept={handleAccept}
                    isAccepted={acceptedIndexes.has(0)}
                    isAccepting={acceptingIndex === 0}
                    onReject={handleReject}
                    isRejected={rejectedIndexes.has(0)}
                    onSaveReview={handleSaveReview}
                    onSaveDraft={handleSaveDraft}
                    isSavingDraft={isSavingDraft}
                    isDraftSaved={savedDraftId !== null}
                />
            )}
            {workflow === 'bulk' && batchRows.length > 0 && (
                <div>
                    {batchSnapshot && (
                        <p className="mb-2 text-xs text-gray-500">
                            {t('bulk.statusSummary', {
                                completed: batchSnapshot.summary.completed,
                                failed: batchSnapshot.summary.failed,
                            })}
                        </p>
                    )}
                    <BulkProcessTable
                        rows={batchRows}
                        translationsNamespace="admin.events.import.bulk"
                        viewingRowId={viewingBatchItemId}
                        onViewResult={(itemId) => {
                            void handleViewBatchResult(itemId);
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
                isOpen={reviewingBatchResult !== null && reviewingBatchItem !== null}
                closeLabel={t('bulk.closePreview')}
                onClose={closeBatchReview}
            >
                {reviewingBatchResult && reviewingBatchItem ? (
                    <EventImportPreview
                        event={reviewingBatchResult.event}
                        races={reviewingBatchResult.races}
                        isLoading={false}
                        error={null}
                        onAccept={handleAcceptBatchItem}
                        isAccepted={reviewingBatchItem.reviewStatus === 'accepted'}
                        isAccepting={isAcceptingBatchItem}
                        onReject={() => undefined}
                        isRejected={false}
                        showReject={false}
                        onSaveReview={handleSaveBatchReview}
                        onSaveDraft={handleSaveBatchDraft}
                        isSavingDraft={isSavingDraft}
                        isDraftSaved={savedBatchDraftId !== null || reviewingBatchItem.savedDraftId !== null}
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
                    onApply={handleApplyJson}
                    onCancel={() => dispatch({ type: 'JSON_TAB_CLOSED' })}
                />
            )}
            <RaceConflictModal
                isOpen={isConflictModalOpen}
                onClose={closeConflictModal}
                conflicts={importConflicts}
            />
        </div>
    );
}

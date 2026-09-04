'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormSelect } from '@/components/ui/form-select';
import { Combobox } from '@/components/ui/combobox';
import type { ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { TabSwitcher } from '@/components/ui/tab-switcher';
import { SectionHeader } from '@/components/ui/section-header';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';
import { ImportJsonEditor } from '@/components/admin/import-json-editor';
import { ImportFileUploadPanel } from '@/components/admin/import-file-upload-panel';
import { ImportWorkflowControls } from '@/components/admin/import-workflow-controls';
import { ResearchWorkflowPanel } from '@/components/admin/research-workflow-panel';
import {
    type ImportPipelineRowConfig,
    type PersistedImportPipelineRow,
} from '@/components/admin/import-pipeline-progress';
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
    startEventResearchBatch,
    getEventResearchBatchHistory,
    getEventResearchBatchStatus,
    retryEventResearchItem,
} from '@/lib/api/events';
import { OPENROUTER_SCRAPE_MODEL_IDS, OPENROUTER_VISION_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';
import { triggerDownload } from '@/lib/utils/download';
import { useLiveTimer } from '@/hooks/use-live-timer';
import { useFileUpload } from '@/hooks/use-file-upload';

import { normalizeUrl } from '@/lib/validation';
import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';
import type { EventImportBatchSnapshot, EventImportResult, EventImportStep, EventImportWorkflow } from '@/types/events-import-api.types';
import type {
    EventResearchBatchHistoryEntry,
    EventResearchBatchSnapshot,
} from '@/types/event-research.types';
import type {
    TrailEventAgentEvent,
    TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PendingEvent } from '@/types/pending-event.types';
import { addPendingEvents } from '@/lib/api/pending-events';
import { RaceConflictModal } from '@/components/ui/race-conflict-modal';
import { useModal } from '@/hooks/use-modal';
import type { ConflictingRace } from '@/types/race.types';
import { Sparkles } from 'lucide-react';

type ScrapeWorkflow = 'bulk' | 'full' | 'ingest' | 'llmFromFile' | 'research';
type ScrapeSourceMode = 'scrapePage' | 'crawlSite';

type ScrapePhase = 'idle' | 'crawling' | 'llm';

const RESEARCH_ERROR_TRANSLATION_KEYS: Record<string, string> = {
    api_error: 'research.errors.apiError',
    incomplete_response: 'research.errors.incompleteResponse',
    parse_error: 'research.errors.parseError',
    processing_error: 'research.errors.processingError',
    refusal: 'research.errors.refusal',
    scheduling_error: 'research.errors.schedulingError',
    timeout: 'research.errors.timeout',
};

function isValidUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
        new URL(normalizeUrl(trimmed));
        return true;
    } catch {
        return false;
    }
}

interface ScrapeState {
    isScraping: boolean;
    scrapePhase: ScrapePhase;
    fullPipelineUiActive: boolean;
    lastRunDurationMs: number | null;
    scrapedRaces: TrailEventAgentRace[];
    scrapeError: string | null;
    scrapeEmptyMessage: string | null;
    hasScraped: boolean;
    scrapeMarkdown: string | null;
    rawModelOutput: string | null;
    scrapeUsage: OpenRouterScrapeUsage | null;
    spiderUsage: ScrapeUsage | null;
    pageStats: PageStats | null;
    scrapedEvent: TrailEventAgentEvent | null;
    acceptedIndexes: Set<number>;
    acceptingIndex: number | null;
    rejectedIndexes: Set<number>;
    jsonView: boolean;
    jsonEditorValue: string;
    jsonEditorError: string | null;
    bulkRows: BulkProcessTableRow[];
    persistedPipelineRows: PersistedImportPipelineRow[];
}

function normalizeRaceTierArrays(
    races: TrailEventAgentRace[],
): TrailEventAgentRace[] {
    return races.map((race) => ({
        ...race,
        tiers: Array.isArray(race.tiers) ? race.tiers : [],
    }));
}

type ScrapeAction =
    // Workflow start
    | { type: 'SCRAPE_START' }
    | { type: 'CRAWL_SITE_EXTRACT_START' }
    // Run completion
    | { type: 'AGENT_SUCCESS'; event: TrailEventAgentEvent | null; races: TrailEventAgentRace[]; errorMessage: string | null; rawModelOutput: string; usage: OpenRouterScrapeUsage | null; markdown?: string }
    | { type: 'IMPORT_SUCCESS'; result: EventImportResult; persistedRows: PersistedImportPipelineRow[]; showPipeline: boolean }
    | { type: 'SCRAPE_ERROR'; error: string; markdown?: string }
    | { type: 'SCRAPE_COMPLETE'; durationMs: number }
    // UI / reset
    | { type: 'PIPELINE_HIDDEN' }
    | { type: 'RESULTS_CLEARED' }
    | { type: 'PREVIEW_LOADED'; scrapedEvent: TrailEventAgentEvent | null; scrapedRaces: TrailEventAgentRace[]; markdown: string; rawModelOutput: string | null; usage: OpenRouterScrapeUsage | null; spiderUsage: ScrapeUsage | null; pageStats: PageStats | null; showPipeline: boolean; durationMs: number; emptyMessage?: string | null }
    | { type: 'WORKFLOW_RESET' }
    // Race review
    | { type: 'ACCEPTING_INDEX'; index: number | null }
    | { type: 'RACE_ACCEPT'; index: number }
    | { type: 'RACE_REJECT'; index: number }
    | { type: 'RACE_EDITED'; index: number; race: TrailEventAgentRace }
    | { type: 'EVENT_REJECT' }
    | { type: 'REVIEW_EDITED'; event: TrailEventAgentEvent; races: TrailEventAgentRace[] }
    // JSON editor
    | { type: 'JSON_TAB_OPENED'; value: string }
    | { type: 'JSON_TAB_CLOSED' }
    | { type: 'JSON_EDITED'; value: string }
    | { type: 'JSON_IMPORTED'; event: TrailEventAgentEvent | null; races: TrailEventAgentRace[]; errorMessage: string | null }
    | { type: 'JSON_PARSE_FAILED'; error: string | null };

const initialScrapeState: ScrapeState = {
    isScraping: false,
    scrapePhase: 'idle',
    fullPipelineUiActive: false,
    lastRunDurationMs: null,
    scrapedRaces: [],
    scrapeError: null,
    scrapeEmptyMessage: null,
    hasScraped: false,
    scrapeMarkdown: null,
    rawModelOutput: null,
    scrapeUsage: null,
    spiderUsage: null,
    pageStats: null,
    scrapedEvent: null,
    acceptedIndexes: new Set(),
    acceptingIndex: null,
    rejectedIndexes: new Set(),
    jsonView: false,
    jsonEditorValue: '',
    jsonEditorError: null,
    bulkRows: [],
    persistedPipelineRows: [],
};

function scrapeReducer(state: ScrapeState, action: ScrapeAction): ScrapeState {
    switch (action.type) {
        // Workflow start
        case 'SCRAPE_START':
            return {
                ...state,
                isScraping: true,
                lastRunDurationMs: null,
                scrapeError: null,
                scrapeEmptyMessage: null,
                scrapedRaces: [],
                hasScraped: false,
                scrapeMarkdown: null,
                rawModelOutput: null,
                scrapeUsage: null,
                spiderUsage: null,
                pageStats: null,
                scrapedEvent: null,
                acceptedIndexes: new Set(),
                acceptingIndex: null,
                rejectedIndexes: new Set(),
                jsonView: false,
                jsonEditorValue: '',
                jsonEditorError: null,
                persistedPipelineRows: [],
            };
        case 'CRAWL_SITE_EXTRACT_START':
            return {
                ...state,
                isScraping: true,
                lastRunDurationMs: null,
                scrapeError: null,
                scrapeEmptyMessage: null,
                scrapedRaces: [],
                hasScraped: false,
                scrapeMarkdown: null,
                rawModelOutput: null,
                scrapeUsage: null,
                spiderUsage: null,
                pageStats: null,
                scrapedEvent: null,
                acceptedIndexes: new Set(),
                acceptingIndex: null,
                rejectedIndexes: new Set(),
                jsonView: false,
                jsonEditorValue: '',
                jsonEditorError: null,
                persistedPipelineRows: [],
                fullPipelineUiActive: true,
                scrapePhase: 'crawling',
            };
        // Run completion
        case 'AGENT_SUCCESS':
            return {
                ...state,
                scrapedEvent: action.event,
                scrapedRaces: normalizeRaceTierArrays(action.races),
                scrapeEmptyMessage: action.event === null || action.races.length === 0 ? action.errorMessage : null,
                rawModelOutput: action.rawModelOutput,
                scrapeUsage: action.usage,
                spiderUsage: null,
                hasScraped: true,
                ...(action.markdown !== undefined ? { scrapeMarkdown: action.markdown } : {}),
            };
        case 'IMPORT_SUCCESS':
            return {
                ...state,
                scrapedEvent: action.result.event,
                scrapedRaces: normalizeRaceTierArrays(action.result.races),
                scrapeEmptyMessage: action.result.event === null || action.result.races.length === 0 ? action.result.errorMessage : null,
                rawModelOutput: action.result.rawModelOutput,
                scrapeUsage: action.result.usage,
                spiderUsage: action.result.scrapeUsage,
                pageStats: action.result.pageStats,
                scrapeMarkdown: action.result.markdown,
                hasScraped: true,
                acceptedIndexes: new Set(),
                acceptingIndex: null,
                rejectedIndexes: new Set(),
                jsonView: false,
                jsonEditorValue: '',
                jsonEditorError: null,
                fullPipelineUiActive: action.showPipeline,
                persistedPipelineRows: action.persistedRows,
                scrapePhase: action.result.workflow === 'crawlSite' || action.result.workflow === 'scrapePage' ? 'crawling' : 'llm',
            };
        case 'SCRAPE_ERROR':
            return {
                ...state,
                scrapeError: action.error,
                hasScraped: true,
                ...(action.markdown !== undefined ? { scrapeMarkdown: action.markdown } : {}),
            };
        case 'SCRAPE_COMPLETE':
            return { ...state, isScraping: false, scrapePhase: 'idle', lastRunDurationMs: action.durationMs };
        // UI / reset
        case 'PIPELINE_HIDDEN':
            return { ...state, fullPipelineUiActive: false };
        case 'RESULTS_CLEARED':
            return {
                ...state,
                scrapeMarkdown: null,
                rawModelOutput: null,
                scrapeUsage: null,
                spiderUsage: null,
                pageStats: null,
                hasScraped: false,
                scrapeError: null,
                scrapeEmptyMessage: null,
                scrapedRaces: [],
                scrapedEvent: null,
                acceptedIndexes: new Set(),
                rejectedIndexes: new Set(),
            };
        case 'PREVIEW_LOADED':
            return {
                ...state,
                isScraping: false,
                scrapePhase: 'idle',
                scrapeError: null,
                scrapeEmptyMessage: action.emptyMessage ?? null,
                hasScraped: true,
                acceptedIndexes: new Set(),
                acceptingIndex: null,
                rejectedIndexes: new Set(),
                lastRunDurationMs: action.durationMs,
                scrapedEvent: action.scrapedEvent,
                scrapedRaces: normalizeRaceTierArrays(action.scrapedRaces),
                scrapeMarkdown: action.markdown,
                rawModelOutput: action.rawModelOutput,
                scrapeUsage: action.usage,
                spiderUsage: action.spiderUsage,
                pageStats: action.pageStats,
                fullPipelineUiActive: action.showPipeline,
            };
        case 'WORKFLOW_RESET':
            return { ...initialScrapeState };
        // Race review
        case 'ACCEPTING_INDEX':
            return { ...state, acceptingIndex: action.index };
        case 'RACE_ACCEPT':
            return { ...state, acceptedIndexes: new Set(state.acceptedIndexes).add(action.index) };
        case 'RACE_REJECT':
            return { ...state, rejectedIndexes: new Set(state.rejectedIndexes).add(action.index) };
        case 'RACE_EDITED':
            return {
                ...state,
                scrapedRaces: state.scrapedRaces.map((r, i) => i === action.index ? action.race : r),
            };
        case 'EVENT_REJECT':
            return { ...state, rejectedIndexes: new Set(state.rejectedIndexes).add(0) };
        case 'REVIEW_EDITED':
            return {
                ...state,
                scrapedEvent: action.event,
                scrapedRaces: normalizeRaceTierArrays(action.races),
                acceptedIndexes: new Set(),
                rejectedIndexes: new Set(),
            };
        // JSON editor
        case 'JSON_TAB_OPENED':
            return { ...state, jsonView: true, jsonEditorValue: action.value, jsonEditorError: null };
        case 'JSON_TAB_CLOSED':
            return { ...state, jsonView: false, jsonEditorError: null };
        case 'JSON_EDITED':
            return { ...state, jsonEditorValue: action.value };
        case 'JSON_IMPORTED':
            return {
                ...state,
                scrapedEvent: action.event,
                scrapedRaces: action.races,
                scrapeEmptyMessage: action.event === null || action.races.length === 0 ? action.errorMessage : null,
                acceptedIndexes: new Set(),
                rejectedIndexes: new Set(),
                jsonEditorError: null,
                jsonView: false,
            };
        case 'JSON_PARSE_FAILED':
            return { ...state, jsonEditorError: action.error };
        default:
            return state;
    }
}

function findStep(
    steps: EventImportStep[],
    name: EventImportStep['name'],
    occurrence = 0,
): EventImportStep | null {
    let seen = 0;
    for (const step of steps) {
        if (step.name !== name) continue;
        if (seen === occurrence) return step;
        seen += 1;
    }
    return null;
}

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
    const [researchNamesInput, setResearchNamesInput] = useState('');
    const [researchHistory, setResearchHistory] = useState<EventResearchBatchHistoryEntry[]>([]);
    const [isLoadingResearchHistory, setIsLoadingResearchHistory] = useState(false);
    const [researchHistoryError, setResearchHistoryError] = useState(false);
    const [activeResearchBatchId, setActiveResearchBatchId] = useState<string | null>(null);
    const [researchSnapshot, setResearchSnapshot] = useState<EventResearchBatchSnapshot | null>(null);
    const [isStartingResearch, setIsStartingResearch] = useState(false);
    const [retryingResearchItemId, setRetryingResearchItemId] = useState<string | null>(null);
    const [importConflicts, setImportConflicts] = useState<ConflictingRace[]>([]);
    const { isOpen: isConflictModalOpen, open: openConflictModal, close: closeConflictModal } = useModal();

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

    const parsedResearchNames = useMemo((): string[] => {
        const unique = new Map<string, string>();
        for (const rawName of researchNamesInput.split(/\r?\n/)) {
            const name = rawName.trim();
            if (!name) continue;
            const key = name.normalize('NFKC').toLocaleLowerCase('es');
            if (!unique.has(key)) unique.set(key, name);
        }
        return [...unique.values()];
    }, [researchNamesInput]);

    const isResearchRunning =
        researchSnapshot?.batch.status === 'pending' ||
        researchSnapshot?.batch.status === 'running';

    const canRunResearch =
        parsedResearchNames.length > 0 &&
        parsedResearchNames.length <= 50 &&
        parsedResearchNames.every((name) => name.length >= 2 && name.length <= 200) &&
        !isStartingResearch &&
        !isResearchRunning;

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
                ? canRunResearch
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

    const fetchResearchStatus = useCallback(async (batchId: string): Promise<EventResearchBatchSnapshot> => {
        const data = await getEventResearchBatchStatus(batchId);
        setResearchSnapshot(data);
        return data;
    }, []);

    const fetchResearchHistory = useCallback(async (): Promise<void> => {
        setIsLoadingResearchHistory(true);
        setResearchHistoryError(false);
        try {
            setResearchHistory(await getEventResearchBatchHistory());
        } catch {
            setResearchHistoryError(true);
        } finally {
            setIsLoadingResearchHistory(false);
        }
    }, []);

    const handleSelectResearchBatch = async (batchId: string): Promise<void> => {
        setActiveResearchBatchId(batchId);
        setResearchSnapshot(null);
        try {
            await fetchResearchStatus(batchId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('research.pollError'));
        }
    };

    const handleStartResearch = async (): Promise<void> => {
        setIsStartingResearch(true);
        setResearchSnapshot(null);
        setActiveResearchBatchId(null);
        try {
            const data = await startEventResearchBatch(parsedResearchNames);
            setActiveResearchBatchId(data.batchId);
            await fetchResearchStatus(data.batchId);
            await fetchResearchHistory();
            toast.success(parsedResearchNames.length === 1
                ? t('research.startSuccessOne')
                : t('research.startSuccess', { count: parsedResearchNames.length }));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('research.runError'));
        } finally {
            setIsStartingResearch(false);
        }
    };

    const handleRetryResearchItem = async (itemId: string): Promise<void> => {
        if (retryingResearchItemId) return;
        setRetryingResearchItemId(itemId);
        try {
            const data = await retryEventResearchItem(itemId);
            setActiveResearchBatchId(data.batchId);
            await fetchResearchStatus(data.batchId);
            await fetchResearchHistory();
            toast.success(t('research.retrySuccess'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('research.retryError'));
        } finally {
            setRetryingResearchItemId(null);
        }
    };

    const handleRunWorkflow = async () => {
        if (workflow === 'bulk') {
            await handleStartBatchImport();
            return;
        }
        if (workflow === 'research') {
            await handleStartResearch();
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
        if (!activeResearchBatchId || !isResearchRunning) return;
        const intervalId = window.setInterval(() => {
            void fetchResearchStatus(activeResearchBatchId).catch((error) => {
                console.error('Event research batch polling error:', error);
                toast.error(t('research.pollError'));
                setActiveResearchBatchId(null);
            });
        }, 3000);
        return () => window.clearInterval(intervalId);
    }, [activeResearchBatchId, fetchResearchStatus, isResearchRunning, t]);

    useEffect(() => {
        if (workflow !== 'research') return;
        void fetchResearchHistory();
    }, [fetchResearchHistory, workflow]);

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
        if (isScraping || isStartingBatch || isStartingResearch) return;
        setWebsiteUrl('');
        setBatchUrlsInput('');
        setActiveBatchId(null);
        setBatchSnapshot(null);
        setResearchNamesInput('');
        setActiveResearchBatchId(null);
        setResearchSnapshot(null);
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

    const fullPipelineSteps = useMemo((): {
        row1: ImportPipelineRowConfig;
        row2: ImportPipelineRowConfig;
    } | null => {
        if (workflow !== 'full' || !fullPipelineUiActive) {
            return null;
        }
        if (!isScraping && !hasScraped) {
            return null;
        }
        let row1: ImportPipelineRowConfig;
        if (isScraping && scrapePhase === 'crawling') {
            row1 = { kind: 'loading', titleKey: 'fullPipelineCrawlingWebsite' };
        } else if (isScraping && scrapePhase === 'llm') {
            row1 = { kind: 'success', titleKey: 'fullPipelineCrawlSuccess' };
        } else if (!isScraping && hasScraped && scrapeError && !scrapeMarkdown) {
            row1 = { kind: 'error', titleKey: 'crawlError', errorDetail: scrapeError };
        } else if (!isScraping && hasScraped && scrapeError && scrapeMarkdown) {
            row1 = { kind: 'success', titleKey: 'fullPipelineCrawlSuccess' };
        } else if (!isScraping && hasScraped && !scrapeError) {
            row1 = { kind: 'success', titleKey: 'fullPipelineCrawlSuccess' };
        } else {
            row1 = { kind: 'loading', titleKey: 'fullPipelineCrawlingWebsite' };
        }

        let row2: ImportPipelineRowConfig;
        if (isScraping && scrapePhase === 'crawling') {
            row2 = { kind: 'loading', titleKey: 'fullPipelineWaitingForCrawl' };
        } else if (isScraping && scrapePhase === 'llm') {
            row2 = { kind: 'loading', titleKey: 'fullPipelineParsingWithLlm' };
        } else if (!isScraping && hasScraped && !scrapeError) {
            row2 = { kind: 'success', titleKey: 'fullPipelineParseSuccess' };
        } else if (!isScraping && hasScraped && scrapeError && !scrapeMarkdown) {
            row2 = { kind: 'pending' };
        } else if (!isScraping && hasScraped && scrapeError && scrapeMarkdown) {
            row2 = { kind: 'error', titleKey: 'llmError', errorDetail: scrapeError };
        } else if (isScraping) {
            row2 = { kind: 'loading', titleKey: 'fullPipelineWaitingForCrawl' };
        } else {
            row2 = { kind: 'pending' };
        }

        return { row1, row2 };
    }, [
        workflow,
        fullPipelineUiActive,
        isScraping,
        hasScraped,
        scrapePhase,
        scrapeError,
        scrapeMarkdown,
    ]);

    const fullPipelineCrawlStepMs = useMemo((): number | null => {
        // Keep this memo recalculating on the live timer tick while crawling is active.
        void liveElapsedMs;
        if (workflow !== 'full' || !fullPipelineUiActive) {
            return null;
        }
        if (crawlStartedAtRef.current === null) {
            return null;
        }
        if (crawlEndedAtRef.current !== null) {
            return Math.round(
                crawlEndedAtRef.current - crawlStartedAtRef.current,
            );
        }
        if (isScraping && scrapePhase === 'crawling') {
            return Math.round(performance.now() - crawlStartedAtRef.current);
        }
        return null;
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs]);

    const fullPipelineLlmStepMs = useMemo((): number | null => {
        // Keep this memo recalculating on the live timer tick while LLM extraction is active.
        void liveElapsedMs;
        if (workflow !== 'full' || !fullPipelineUiActive) {
            return null;
        }
        if (llmStartedAtRef.current === null) {
            return null;
        }
        if (llmEndedAtRef.current !== null) {
            return Math.round(
                llmEndedAtRef.current - llmStartedAtRef.current,
            );
        }
        if (isScraping && scrapePhase === 'llm') {
            return Math.round(performance.now() - llmStartedAtRef.current);
        }
        return null;
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs]);

    const batchRows = useMemo((): BulkProcessTableRow[] => {
        return batchSnapshot?.items.map((item) => ({
            id: item.id,
            url: item.url,
            status: item.status,
            reviewStatus: item.reviewStatus,
            acceptedEventId: item.acceptedEventId,
            acceptedEventSlug: item.acceptedEventSlug,
            raceCount: item.raceCount,
            error: item.error,
            updatedAt: item.updatedAt,
            markdown: item.markdown,
            rawModelOutput: item.rawModelOutput,
        })) ?? [];
    }, [batchSnapshot]);

    const researchRows = useMemo((): BulkProcessTableRow[] => {
        return researchSnapshot?.items.map((item) => ({
            id: item.id,
            label: item.eventName,
            url: null,
            status: item.status,
            reviewStatus: 'pending',
            acceptedEventId: null,
            acceptedEventSlug: null,
            raceCount: item.raceCount,
            error: item.error
                ? t(RESEARCH_ERROR_TRANSLATION_KEYS[item.error] ?? 'research.errors.unknown')
                : null,
            negativeMessage:
                item.status === 'completed' && item.draftId === null
                    ? item.result?.errorMessage ?? null
                    : null,
            updatedAt: item.updatedAt,
            markdown: null,
            rawModelOutput: null,
            draftId: item.draftId,
        })) ?? [];
    }, [researchSnapshot, t]);

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
                        disabled={isScraping || isStartingBatch || isStartingResearch}
                    />

                    {(workflow === 'full' || workflow === 'ingest') && (
                        <Combobox
                            id="websiteUrl"
                            label={t('websiteUrlLabel')}
                            value={websiteUrl}
                            onChange={setWebsiteUrl}
                            options={pendingUrlOptions}
                            placeholder={t('websiteUrlPlaceholder')}
                            disabled={isScraping}
                            className="max-w-xl"
                        />
                    )}

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
                            namesInput={researchNamesInput}
                            parsedNamesCount={parsedResearchNames.length}
                            isStarting={isStartingResearch}
                            isRunning={isResearchRunning}
                            history={researchHistory}
                            activeBatchId={activeResearchBatchId}
                            isLoadingHistory={isLoadingResearchHistory}
                            hasHistoryError={researchHistoryError}
                            onNamesInputChange={setResearchNamesInput}
                            onSelectBatch={(batchId) => void handleSelectResearchBatch(batchId)}
                            onRetryHistory={() => void fetchResearchHistory()}
                        />
                    )}

                    {workflow === 'full' && (
                        <div className="grid max-w-xl grid-cols-2 gap-4">
                            <FormSelect
                                id="importSourceMode"
                                label={t('importSourceModeLabel')}
                                value={sourceMode}
                                onChange={(e) => setSourceMode(e.target.value as ScrapeSourceMode)}
                                disabled={isScraping}
                            >
                                <option value="scrapePage">{t('sourceScrapePage')}</option>
                                <option value="crawlSite">{t('sourceCrawlSite')}</option>
                            </FormSelect>
                            <FormSelect
                                id="openrouterModel"
                                label={t('modelLabel')}
                                value={selectedModelId}
                                onChange={(e) =>
                                    setSelectedModelId(e.target.value as OpenRouterScrapeModelId)
                                }
                                disabled={isScraping || isStartingBatch || isBatchRunning}
                            >
                                {OPENROUTER_SCRAPE_MODEL_IDS.map((id) => (
                                    <option key={id} value={id}>
                                        {id}
                                    </option>
                                ))}
                            </FormSelect>
                        </div>
                    )}

                    {workflow === 'ingest' && (
                        <FormSelect
                            id="importSourceMode"
                            label={t('importSourceModeLabel')}
                            value={sourceMode}
                            onChange={(e) => setSourceMode(e.target.value as ScrapeSourceMode)}
                            disabled={isScraping}
                            containerClassName="max-w-xl"
                        >
                            <option value="scrapePage">{t('sourceScrapePage')}</option>
                            <option value="crawlSite">{t('sourceCrawlSite')}</option>
                        </FormSelect>
                    )}

                    {workflow === 'llmFromFile' && (
                        <>
                            <ImportFileUploadPanel
                                fileUpload={fileUpload}
                                isScraping={isScraping}
                                onClear={handleClearUpload}
                            />
                            <Combobox
                                id="websiteUrlForAccept"
                                label={t('eventUrlForAcceptLabel')}
                                value={websiteUrl}
                                onChange={setWebsiteUrl}
                                options={pendingUrlOptions}
                                placeholder={t('websiteUrlPlaceholder')}
                                helperText={t('urlForAcceptHint')}
                                disabled={isScraping}
                                className="max-w-xl"
                            />
                        </>
                    )}

                    {(workflow === 'bulk' || (workflow === 'llmFromFile' && uploadKind !== 'images')) && (
                        <FormSelect
                            id="openrouterModel"
                            label={t('modelLabel')}
                            value={selectedModelId}
                            onChange={(e) =>
                                setSelectedModelId(e.target.value as OpenRouterScrapeModelId)
                            }
                            disabled={isScraping || isStartingBatch || isBatchRunning}
                            containerClassName="max-w-xl"
                        >
                            {OPENROUTER_SCRAPE_MODEL_IDS.map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                        </FormSelect>
                    )}

                    {workflow === 'llmFromFile' && uploadKind === 'images' && (
                        <FormSelect
                            id="openrouterVisionModel"
                            label={t('modelLabel')}
                            value={selectedVisionModelId}
                            onChange={(e) =>
                                setSelectedVisionModelId(e.target.value as OpenRouterVisionModelId)
                            }
                            disabled={isScraping}
                            containerClassName="max-w-xl"
                        >
                            {OPENROUTER_VISION_MODEL_IDS.map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                        </FormSelect>
                    )}
                    <ImportWorkflowControls
                        workflow={workflow}
                        canRun={canRunWorkflow}
                        isScraping={isScraping}
                        isStartingBatch={isStartingBatch}
                        isStartingResearch={isStartingResearch}
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
            {workflow === 'research' && researchRows.length > 0 && (
                <div>
                    {researchSnapshot ? (
                        <p className="mb-2 text-xs text-gray-500">
                            {t('research.statusSummary', {
                                completed: researchSnapshot.summary.completed,
                                failed: researchSnapshot.summary.failed,
                                total: researchSnapshot.summary.total,
                            })}
                        </p>
                    ) : null}
                    <BulkProcessTable
                        rows={researchRows}
                        translationsNamespace="admin.events.import.research"
                        primaryColumnKey="eventName"
                        retryingRowId={retryingResearchItemId}
                        onRetry={(itemId) => {
                            void handleRetryResearchItem(itemId);
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

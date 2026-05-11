'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FormSelect } from '@/components/ui/form-select';
import { Combobox } from '@/components/ui/combobox';
import type { ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import { TabSwitcher } from '@/components/ui/tab-switcher';
import { SectionHeader } from '@/components/ui/section-header';
import { SuggestedRacesPreview } from '@/components/race/suggested-races-preview';
import {
    DUMMY_CRAWL_PAGE_STATS,
    DUMMY_LAST_RUN_DURATION_MS,
    DUMMY_RAW_MODEL_OUTPUT,
    DUMMY_SCRAPE_MARKDOWN,
    DUMMY_SCRAPE_USAGE,
    DUMMY_SCRAPED_RACES,
} from '@/components/admin/scrape-preview.mock';
import { BulkProcessTable } from '@/components/admin/bulk-process-table';
import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';
import {
    runTrailRaceAgent,
    runRaceImport,
    acceptScrapedRace,
    startRaceImportBatch,
    getBatchStatus,
    getItemResult,
} from '@/lib/api/races';
import { OPENROUTER_SCRAPE_MODEL_IDS, OPENROUTER_VISION_MODEL_IDS } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';
import { formatDurationMs } from '@/lib/format-duration';
import { useLiveTimer } from '@/hooks/use-live-timer';
import { useFileUpload } from '@/hooks/use-file-upload';
import {
    estimateMarkdownTokensHeuristic,
    markdownTrimmedCharCount,
} from '@/lib/scrape-markdown-token-estimate';
import { normalizeUrl } from '@/lib/validation';
import type { PageStats } from '@/types/races-scrape-api.types';
import type { RaceImportBatchSnapshot, RaceImportResult, RaceImportStep, RaceImportWorkflow } from '@/types/races-import-api.types';
import type { TrailRace } from '@/types/trail-race-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PendingRace } from '@/types/pending-race.types';
import { addPendingRaces } from '@/lib/api/pending-races';
import { RaceConflictModal } from '@/components/ui/race-conflict-modal';
import { useModal } from '@/hooks/use-modal';
import type { ConflictingRace } from '@/types/race.types';
import { XCircle, RefreshCw, Sparkles, FileText, ImageIcon, X, Play } from 'lucide-react';

type ScrapeWorkflow = 'bulk' | 'full' | 'ingest' | 'llmFromFile';
type ScrapeSourceMode = 'scrapePage' | 'crawlSite';

type ScrapePhase = 'idle' | 'crawling' | 'llm';

type FullPipelineRowKind = 'loading' | 'success' | 'error' | 'pending';

interface FullPipelineRowConfig {
    kind: FullPipelineRowKind;
    /** Translation key for title line (omit when kind is pending). */
    titleKey?: string;
    errorDetail?: string | null;
}

interface PersistedPipelineRow {
    kind: FullPipelineRowKind;
    titleKey?: string;
    errorDetail?: string | null;
    durationMs: number | null;
    pageStats?: PageStats | null;
    markdownTokenEstimate?: number | null;
    markdownCharCount?: number | null;
}

function FullPipelineRowIcon({ kind }: { kind: FullPipelineRowKind }): React.ReactElement {
    if (kind === 'loading') {
        return (
            <div
                className="pipeline-loading-dot h-2.5 w-2.5 shrink-0 translate-y-px rounded-full bg-radial-[at_50%_50%] from-gray-300 to-gray-200"
                aria-hidden
            />
        );
    }
    if (kind === 'success') {
        return (
            <div
                className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-full bg-radial-[at_50%_50%] from-green-300 to-green-200"
                aria-hidden
            />
        );
    }
    if (kind === 'error') {
        return (
            <XCircle className="h-4 w-4 shrink-0 text-red-600" strokeWidth={2} aria-hidden />
        );
    }
    return (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-xs leading-none text-gray-300" aria-hidden>
            —
        </span>
    );
}

function RestartIcon({ className = 'h-5 w-5' }: { className?: string }): React.ReactElement {
    return <RefreshCw className={className} strokeWidth={2} />;
}

function PageStatsBadges({ pageStats, size = 'sm' }: { pageStats: PageStats; size?: 'sm' | 'md' }): React.ReactElement {
    const t = useTranslations('admin.races.import');
    const cls = size === 'sm' ? 'px-2 text-[11px]' : 'px-2.5 py-1 text-xs';
    return (
        <>
            <span className={`inline-flex items-center rounded-full border border-gray-200/80 bg-gray-100 font-medium text-gray-800 tabular-nums ${cls}`}>
                {t('crawledPagesTotal', { scrapedPages: pageStats.total })}
            </span>
            <span className={`inline-flex items-center rounded-full border border-green-200/80 bg-green-100 font-medium text-green-800 tabular-nums ${cls}`}>
                {t('crawledPagesHttpSuccess', { successPages: pageStats.successCount })}
            </span>
            <span className={`inline-flex items-center rounded-full border border-red-200/80 bg-red-100 font-medium text-red-800 tabular-nums ${cls}`}>
                {t('crawledPagesHttpError', { errorPages: pageStats.errorCount })}
            </span>
        </>
    );
}

function PipelineRow({ kind, title, durationMs, errorDetail, children }: {
    kind: FullPipelineRowKind;
    title?: string;
    durationMs?: number | null;
    errorDetail?: string | null;
    children?: ReactNode;
}): React.ReactElement {
    const t = useTranslations('admin.races.import');
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-5 w-4 shrink-0 flex-col items-center justify-center">
                <FullPipelineRowIcon kind={kind} />
            </div>
            <div className="min-w-0 flex-1">
                {title !== undefined && (
                    <>
                        <p className={`flex flex-wrap items-center gap-x-2 text-sm font-medium leading-5 ${kind === 'error' ? 'text-red-700' : 'text-gray-900'}`}>
                            <span>{title}</span>
                            {durationMs != null && (
                                <span className="text-xs font-normal text-gray-500 tabular-nums">
                                    {t('fullPipelineStepDuration', { duration: formatDurationMs(durationMs) })}
                                </span>
                            )}
                            {children}
                        </p>
                        {errorDetail && (
                            <p className="mt-0.5 text-xs text-red-600">{errorDetail}</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function triggerMarkdownFileDownload(markdown: string, downloadName: string): void {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = downloadName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
}

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
    scrapedRaces: TrailRace[];
    scrapeError: string | null;
    scrapeEmptyMessage: string | null;
    hasScraped: boolean;
    scrapeMarkdown: string | null;
    rawModelOutput: string | null;
    scrapeUsage: OpenRouterScrapeUsage | null;
    pageStats: PageStats | null;
    acceptedIndexes: Set<number>;
    acceptingIndex: number | null;
    rejectedIndexes: Set<number>;
    jsonView: boolean;
    jsonEditorValue: string;
    jsonEditorError: string | null;
    bulkRows: BulkProcessTableRow[];
    persistedPipelineRows: PersistedPipelineRow[];
}

type ScrapeAction =
    // Workflow start
    | { type: 'SCRAPE_START' }
    | { type: 'CRAWL_SITE_EXTRACT_START' }
    // Run completion
    | { type: 'AGENT_SUCCESS'; races: TrailRace[]; errorMessage: string | null; rawModelOutput: string; usage: OpenRouterScrapeUsage | null; markdown?: string }
    | { type: 'IMPORT_SUCCESS'; result: RaceImportResult; persistedRows: PersistedPipelineRow[]; showPipeline: boolean }
    | { type: 'SCRAPE_ERROR'; error: string }
    | { type: 'SCRAPE_COMPLETE'; durationMs: number }
    // UI / reset
    | { type: 'PIPELINE_HIDDEN' }
    | { type: 'RESULTS_CLEARED' }
    | { type: 'PREVIEW_LOADED'; scrapedRaces: TrailRace[]; markdown: string; rawModelOutput: string | null; usage: OpenRouterScrapeUsage | null; pageStats: PageStats | null; showPipeline: boolean; durationMs: number; emptyMessage?: string | null }
    | { type: 'WORKFLOW_RESET' }
    // Race review
    | { type: 'ACCEPTING_INDEX'; index: number | null }
    | { type: 'RACE_ACCEPT'; index: number }
    | { type: 'RACE_REJECT'; index: number }
    | { type: 'RACE_EDITED'; index: number; race: TrailRace }
    // JSON editor
    | { type: 'JSON_TAB_OPENED'; value: string }
    | { type: 'JSON_TAB_CLOSED' }
    | { type: 'JSON_EDITED'; value: string }
    | { type: 'JSON_IMPORTED'; races: TrailRace[] }
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
    pageStats: null,
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
                pageStats: null,
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
                pageStats: null,
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
                scrapedRaces: action.races,
                scrapeEmptyMessage: action.races.length === 0 ? action.errorMessage : null,
                rawModelOutput: action.rawModelOutput,
                scrapeUsage: action.usage,
                hasScraped: true,
                ...(action.markdown !== undefined ? { scrapeMarkdown: action.markdown } : {}),
            };
        case 'IMPORT_SUCCESS':
            return {
                ...state,
                scrapedRaces: action.result.races,
                scrapeEmptyMessage: action.result.races.length === 0 ? action.result.errorMessage : null,
                rawModelOutput: action.result.rawModelOutput,
                scrapeUsage: action.result.usage,
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
            return { ...state, scrapeError: action.error, hasScraped: true };
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
                pageStats: null,
                hasScraped: false,
                scrapeError: null,
                scrapeEmptyMessage: null,
                scrapedRaces: [],
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
                scrapedRaces: action.scrapedRaces,
                scrapeMarkdown: action.markdown,
                rawModelOutput: action.rawModelOutput,
                scrapeUsage: action.usage,
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
                scrapedRaces: action.races,
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

interface MarkdownStatLineProps {
    tokenEstimate: number;
    charCount: number;
    as?: 'span' | 'p';
}

function MarkdownStatLine({ tokenEstimate, charCount, as: Tag = 'span' }: MarkdownStatLineProps) {
    const t = useTranslations('admin.races.import');
    return (
        <Tag className="text-xs font-normal text-gray-500 tabular-nums">
            <span className="font-bold text-gray-700">{tokenEstimate}</span>{' '}
            {t('markdownStatTokensLabel')}
            {' · '}
            <span className="font-bold text-gray-700">{charCount}</span>{' '}
            {t('markdownStatCharactersLabel')}
        </Tag>
    );
}

function findStep(
    steps: RaceImportStep[],
    name: RaceImportStep['name'],
    occurrence = 0,
): RaceImportStep | null {
    let seen = 0;
    for (const step of steps) {
        if (step.name !== name) continue;
        if (seen === occurrence) return step;
        seen += 1;
    }
    return null;
}

interface RaceImporterProps {
    pendingEntries: PendingRace[];
}

export function RaceImporter({ pendingEntries }: RaceImporterProps) {
    const t = useTranslations('admin.races.import');

    const pendingUrlOptions: ComboboxOption[] = pendingEntries.map((e) => ({
        value: e.url,
        label: e.url.replace(/^https?:\/\/(www\.)?/, ''),
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
    const [batchSnapshot, setBatchSnapshot] = useState<RaceImportBatchSnapshot | null>(null);
    const [isStartingBatch, setIsStartingBatch] = useState(false);
    const [viewingBatchItemId, setViewingBatchItemId] = useState<string | null>(null);
    const [isAddingToPending, setIsAddingToPending] = useState(false);
    const [importConflicts, setImportConflicts] = useState<ConflictingRace[]>([]);
    const { isOpen: isConflictModalOpen, open: openConflictModal, close: closeConflictModal } = useModal();

    const [state, dispatch] = useReducer(scrapeReducer, initialScrapeState);
    const {
        isScraping,
        scrapePhase,
        fullPipelineUiActive,
        lastRunDurationMs,
        scrapedRaces,
        scrapeError,
        scrapeEmptyMessage,
        hasScraped,
        scrapeMarkdown,
        rawModelOutput,
        scrapeUsage,
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
        dispatch({ type: 'RESULTS_CLEARED' });
    };

    const handleAddToPending = async (): Promise<void> => {
        if (isAddingToPending || !websiteUrl) return;
        setIsAddingToPending(true);
        try {
            const result = await addPendingRaces([normalizeUrl(websiteUrl)]);
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
        markdownFileInputRef,
        imageFileInputRef,
        uploadedMarkdown,
        uploadedFileName,
        uploadedImages,
        uploadKind,
        handleMarkdownFileChange,
        handleImageFilesChange,
        handleRemoveImage,
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
        setWorkflow(next);
        if (next !== 'llmFromFile') {
            fileUpload.clearUpload();
        }
    };

    const handleClearUpload = (): void => {
        fileUpload.clearUpload();
        resetScrapeResults();
    };

    const resolveImportWorkflow = (): RaceImportWorkflow | null => {
        if (workflow === 'full') {
            return sourceMode === 'crawlSite' ? 'crawlSiteExtract' : 'scrapePageExtract';
        }
        if (workflow === 'ingest') return sourceMode;
        return null;
    };

    const setCompletedImportStepRefs = (result: RaceImportResult): void => {
        const crawlStep = findStep(result.steps, 'crawlSite') ?? findStep(result.steps, 'scrapePage');
        const extractStep = findStep(result.steps, 'extract');

        crawlStartedAtRef.current = crawlStep ? 0 : null;
        crawlEndedAtRef.current = crawlStep ? crawlStep.durationMs : null;
        llmStartedAtRef.current = extractStep ? 0 : null;
        llmEndedAtRef.current = extractStep ? extractStep.durationMs : null;
    };

    const fetchBatchStatus = useCallback(async (batchId: string): Promise<RaceImportBatchSnapshot> => {
        const data = await getBatchStatus(batchId);
        setBatchSnapshot(data);
        return data;
    }, []);

    const handleStartBatchImport = async (): Promise<void> => {
        setIsStartingBatch(true);
        setBatchSnapshot(null);
        setActiveBatchId(null);
        resetScrapeResults();

        try {
            const result = await startRaceImportBatch({
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

                const result = await runRaceImport(
                    importWorkflow === 'crawlSite' || importWorkflow === 'scrapePage'
                        ? { workflow: importWorkflow, websiteUrl: normalizedUrl }
                        : { workflow: importWorkflow, websiteUrl: normalizedUrl, model: selectedModelId },
                );

                if (!result.ok) {
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
                    const data = await runTrailRaceAgent({
                        mode: 'images',
                        images: uploadedImages.map(img => img.dataUrl),
                        model: selectedVisionModelId,
                    });
                    dispatch({ type: 'AGENT_SUCCESS', races: data.races, errorMessage: data.errorMessage, rawModelOutput: data.rawModelOutput, usage: data.usage });
                } else {
                    const markdownBody = uploadedMarkdown;
                    if (!markdownBody) return;
                    const data = await runTrailRaceAgent({
                        mode: 'markdown',
                        markdown: markdownBody,
                        model: selectedModelId,
                    });
                    dispatch({ type: 'AGENT_SUCCESS', races: data.races, errorMessage: data.errorMessage, rawModelOutput: data.rawModelOutput, usage: data.usage, markdown: data.markdown });
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('scrapeError');
            dispatch({ type: 'SCRAPE_ERROR', error: errorMessage });
            toast.error(t('scrapeError'));
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

    const handleViewBatchResult = async (itemId: string): Promise<void> => {
        setViewingBatchItemId(itemId);

        try {
            const result = await getItemResult(itemId);
            setWebsiteUrl(result.url);
            setCompletedImportStepRefs(result);
            dispatch({
                type: 'IMPORT_SUCCESS',
                result,
                persistedRows: [],
                showPipeline: false,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('bulk.resultError');
            toast.error(errorMessage);
        } finally {
            setViewingBatchItemId(null);
        }
    };

    const handleAccept = async (index: number) => {
        dispatch({ type: 'ACCEPTING_INDEX', index });
        try {
            const normalizedUrl = normalizeUrl(websiteUrl.trim());
            await acceptScrapedRace(scrapedRaces[index], normalizedUrl);
            dispatch({ type: 'RACE_ACCEPT', index });
            toast.success(t('results.acceptSuccess'));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('results.acceptError');
            toast.error(errorMessage);
        } finally {
            dispatch({ type: 'ACCEPTING_INDEX', index: null });
        }
    };

    const handleReject = (index: number) => {
        dispatch({ type: 'RACE_REJECT', index });
        toast.success(t('results.rejectSuccess'));
    };

    const handleSave = (index: number, updatedRace: TrailRace) => {
        dispatch({ type: 'RACE_EDITED', index, race: updatedRace });
    };

    const handleSwitchToJsonView = (): void => {
        dispatch({ type: 'JSON_TAB_OPENED', value: JSON.stringify(scrapedRaces, null, 2) });
    };

    const handleApplyJson = (): void => {
        try {
            const parsed = JSON.parse(jsonEditorValue);
            if (!Array.isArray(parsed)) {
                dispatch({ type: 'JSON_PARSE_FAILED', error: t('jsonNotArrayError') });
                return;
            }
            dispatch({ type: 'JSON_IMPORTED', races: parsed as TrailRace[] });
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
            scrapedRaces: isMarkdownOnly ? [] : [...DUMMY_SCRAPED_RACES],
            emptyMessage: isMarkdownOnly ? t('results.noResults') : null,
            markdown: DUMMY_SCRAPE_MARKDOWN,
            rawModelOutput: isMarkdownOnly ? null : DUMMY_RAW_MODEL_OUTPUT,
            usage: isMarkdownOnly ? null : { ...DUMMY_SCRAPE_USAGE },
            pageStats: workflow === 'llmFromFile' ? null : { ...DUMMY_CRAWL_PAGE_STATS },
            showPipeline: workflow === 'full',
        });
    };

    const handleRestart = (): void => {
        if (isScraping || isStartingBatch) return;
        setWebsiteUrl('');
        setBatchUrlsInput('');
        setActiveBatchId(null);
        setBatchSnapshot(null);
        setViewingBatchItemId(null);
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
        triggerMarkdownFileDownload(scrapeMarkdown, downloadName);
    };

    const handleDownloadRawModelOutput = (): void => {
        if (rawModelOutput === null || rawModelOutput === '') return;
        const blob = new Blob([rawModelOutput], {
            type: 'application/json;charset=utf-8',
        });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `model-raw-${Date.now()}.json`;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
    };

    const showSuggestedRacesPreview =
        workflow !== 'ingest'
            ? isScraping || hasScraped
            : hasScraped && scrapeError !== null;

    const primaryLoadingLabel =
        workflow === 'ingest'
            ? t('crawlingMarkdown')
            : workflow === 'bulk'
                ? t('bulk.running')
                : workflow === 'full' && scrapePhase === 'crawling'
                    ? t('crawlingMarkdown')
                    : t('scraping');

    const showLlmMetricsUi = workflow !== 'ingest';

    const markdownTokenEstimate = useMemo((): number | null => {
        if (scrapeMarkdown === null || scrapeMarkdown === '') {
            return null;
        }
        return estimateMarkdownTokensHeuristic(scrapeMarkdown);
    }, [scrapeMarkdown]);

    /** Parse: estimate from upload; hidden once scrapeMarkdown exists (same row as post-scrape estimate below buttons). */
    const parseUploadTokenEstimate = useMemo((): number | null => {
        if (workflow !== 'llmFromFile' || uploadKind !== 'markdown') {
            return null;
        }
        if (uploadedMarkdown === null || uploadedMarkdown === '') {
            return null;
        }
        if (scrapeMarkdown !== null && scrapeMarkdown !== '') {
            return null;
        }
        return estimateMarkdownTokensHeuristic(uploadedMarkdown);
    }, [workflow, uploadKind, uploadedMarkdown, scrapeMarkdown]);

    const showMarkdownEstimateLine =
        showLlmMetricsUi &&
        ((parseUploadTokenEstimate !== null && uploadedMarkdown !== null) ||
            (markdownTokenEstimate !== null && scrapeMarkdown !== null));

    const fullPipelineSteps = useMemo((): {
        row1: FullPipelineRowConfig;
        row2: FullPipelineRowConfig;
    } | null => {
        if (workflow !== 'full' || !fullPipelineUiActive) {
            return null;
        }
        if (!isScraping && !hasScraped) {
            return null;
        }
        let row1: FullPipelineRowConfig;
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

        let row2: FullPipelineRowConfig;
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

    const showMarkdownEstimateBesidePageStats =
        workflow === 'full' &&
        fullPipelineSteps !== null &&
        pageStats !== null &&
        showMarkdownEstimateLine;

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
            raceCount: item.raceCount,
            updatedAt: item.updatedAt,
        })) ?? [];
    }, [batchSnapshot]);

    return (
        <div className="flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />
            <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
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
                            { id: 'ingest', label: t('workflowIngest') },
                            { id: 'llmFromFile', label: t('workflowLlmFromFile') },
                        ]}
                        activeId={workflow}
                        onChange={(id) => handleWorkflowChange(id as ScrapeWorkflow)}
                        disabled={isScraping || isStartingBatch}
                    />

                    {(workflow === 'full' || workflow === 'ingest') && (
                        <div className="grid gap-2 w-full">
                            <Combobox
                                id="websiteUrl"
                                label={t('websiteUrlLabel')}
                                value={websiteUrl}
                                onChange={setWebsiteUrl}
                                options={pendingUrlOptions}
                                placeholder={t('websiteUrlPlaceholder')}
                                disabled={isScraping}
                            />
                        </div>
                    )}

                    {workflow === 'bulk' && (
                        <div className="grid gap-2 w-full">
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
                            <p className="text-xs text-gray-500">
                                {parsedBatchUrls.length === 1 ? t('bulk.urlsHintOne') : t('bulk.urlsHint', { count: parsedBatchUrls.length })}
                            </p>
                        </div>
                    )}

                    {(workflow === 'full' || workflow === 'ingest') && (
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
                    )}

                    {workflow === 'llmFromFile' && (
                        <>
                            <div className="grid gap-2 w-full">
                                <label className="text-sm font-medium leading-none text-gray-900">
                                    {t('uploadTypeLabel')}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={markdownFileInputRef}
                                        id="uploadMarkdownFile"
                                        type="file"
                                        accept=".md,.json,text/markdown,text/plain,application/json"
                                        className="sr-only"
                                        onChange={handleMarkdownFileChange}
                                        disabled={isScraping}
                                    />
                                    <input
                                        ref={imageFileInputRef}
                                        id="uploadImageFiles"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="sr-only"
                                        onChange={handleImageFilesChange}
                                        disabled={isScraping}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => markdownFileInputRef.current?.click()}
                                        disabled={isScraping || uploadKind === 'images'}
                                        title={t('uploadMarkdownButtonTitle')}
                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${uploadKind === 'markdown'
                                            ? 'border-gray-900 bg-gray-50 text-gray-900'
                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <FileText className="h-4 w-4" strokeWidth={2} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => imageFileInputRef.current?.click()}
                                        disabled={isScraping || uploadKind === 'markdown'}
                                        title={t('uploadImagesButtonTitle')}
                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${uploadKind === 'images'
                                            ? 'border-gray-900 bg-gray-50 text-gray-900'
                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <ImageIcon className="h-4 w-4" strokeWidth={2} />
                                    </button>
                                    {uploadKind !== null && (
                                        <button
                                            type="button"
                                            onClick={handleClearUpload}
                                            disabled={isScraping}
                                            title={t('clearUpload')}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <X className="h-4 w-4" strokeWidth={2} />
                                        </button>
                                    )}
                                </div>
                                {uploadKind === 'markdown' && uploadedFileName && (
                                    <span className="text-sm text-gray-600 truncate max-w-full sm:max-w-md">
                                        {uploadedFileName}
                                    </span>
                                )}
                                {uploadKind === 'images' && uploadedImages.length > 0 && (
                                    <>
                                        <span className="text-xs text-gray-500">
                                            {uploadedImages.length === 1 ? t('imageCountOne') : t('imageCount', { count: uploadedImages.length })}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {uploadedImages.map((img, idx) => (
                                                <div key={idx} className="relative flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                                                    <Image
                                                        src={img.dataUrl}
                                                        alt={img.name}
                                                        width={32}
                                                        height={32}
                                                        unoptimized
                                                        className="h-8 w-8 rounded object-cover"
                                                    />
                                                    <span className="max-w-[120px] truncate text-xs text-gray-600">{img.name}</span>
                                                    {!isScraping && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImage(idx)}
                                                            className="ml-1 text-gray-400 hover:text-gray-700"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <Combobox
                                id="websiteUrlForAccept"
                                label={t('eventUrlForAcceptLabel')}
                                value={websiteUrl}
                                onChange={setWebsiteUrl}
                                options={pendingUrlOptions}
                                placeholder={t('websiteUrlPlaceholder')}
                                helperText={t('urlForAcceptHint')}
                                disabled={isScraping}
                            />
                        </>
                    )}

                    {(workflow === 'full' || workflow === 'bulk' || (workflow === 'llmFromFile' && uploadKind !== 'images')) && (
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
                        >
                            {OPENROUTER_VISION_MODEL_IDS.map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                        </FormSelect>
                    )}
                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                        <Button
                            type="button"
                            onClick={handleRunWorkflow}
                            disabled={!canRunWorkflow}
                            isLoading={isScraping || isStartingBatch}
                            loadingText={primaryLoadingLabel}
                        >
                            <span className="inline-flex items-center gap-2">
                                <Play className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                                {t('runWorkflowButton')}
                            </span>
                        </Button>
                        {(scrapeMarkdown || (rawModelOutput !== null && rawModelOutput !== '')) && (
                            <IconActionMenu
                                triggerAriaLabel={t('downloadMenuTriggerLabel')}
                                disabled={isScraping}
                                items={[
                                    {
                                        id: 'markdown',
                                        label: t('downloadMenuMarkdown'),
                                        disabled: !scrapeMarkdown,
                                        onSelect: handleDownloadMarkdown,
                                    },
                                    {
                                        id: 'json',
                                        label: t('downloadMenuJson'),
                                        disabled: rawModelOutput === null || rawModelOutput === '',
                                        onSelect: handleDownloadRawModelOutput,
                                    },
                                ]}
                            />
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleLoadDummyPreview}
                            disabled={isScraping || isStartingBatch}
                        >
                            {t('loadDummyPreview')}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleRestart}
                            disabled={isScraping || isStartingBatch}
                            className="h-9 w-9 min-h-9 shrink-0 p-0"
                            title={t('restart')}
                        >
                            <RestartIcon className="h-5 w-5" />
                        </Button>
                    </div>
                    {(fullPipelineSteps !== null || persistedPipelineRows.length > 0) && (
                        <div className="space-y-3 border-t border-gray-100 pt-4">
                            {persistedPipelineRows.map((row, idx) => (
                                <PipelineRow
                                    key={`persisted-${idx}`}
                                    kind={row.kind}
                                    title={row.titleKey !== undefined ? t(row.titleKey) : undefined}
                                    durationMs={row.durationMs}
                                    errorDetail={row.errorDetail}
                                >
                                    {row.pageStats && (
                                        <span className="inline-flex flex-wrap items-center gap-1.5">
                                            <PageStatsBadges pageStats={row.pageStats} />
                                            {row.markdownTokenEstimate != null && row.markdownCharCount != null && (
                                                <MarkdownStatLine
                                                    tokenEstimate={row.markdownTokenEstimate}
                                                    charCount={row.markdownCharCount}
                                                />
                                            )}
                                        </span>
                                    )}
                                </PipelineRow>
                            ))}
                            {fullPipelineSteps !== null && (
                                <>
                                    <PipelineRow
                                        kind={fullPipelineSteps.row1.kind}
                                        title={fullPipelineSteps.row1.titleKey !== undefined ? t(fullPipelineSteps.row1.titleKey) : undefined}
                                        durationMs={fullPipelineCrawlStepMs}
                                        errorDetail={fullPipelineSteps.row1.errorDetail}
                                    >
                                        {workflow === 'full' && pageStats !== null && (
                                            <span className="inline-flex flex-wrap items-center gap-1.5">
                                                <PageStatsBadges pageStats={pageStats} />
                                                {showMarkdownEstimateBesidePageStats && (
                                                    <MarkdownStatLine
                                                        tokenEstimate={parseUploadTokenEstimate ?? markdownTokenEstimate!}
                                                        charCount={
                                                            parseUploadTokenEstimate !== null
                                                                ? markdownTrimmedCharCount(uploadedMarkdown!)
                                                                : markdownTrimmedCharCount(scrapeMarkdown!)
                                                        }
                                                    />
                                                )}
                                            </span>
                                        )}
                                    </PipelineRow>
                                    <PipelineRow
                                        kind={fullPipelineSteps.row2.kind}
                                        title={fullPipelineSteps.row2.titleKey !== undefined ? t(fullPipelineSteps.row2.titleKey) : undefined}
                                        durationMs={fullPipelineLlmStepMs}
                                        errorDetail={fullPipelineSteps.row2.errorDetail}
                                    />
                                </>
                            )}
                        </div>
                    )}
                    {workflow === 'ingest' && pageStats !== null && (
                        <div className="flex flex-wrap items-center gap-2">
                            <PageStatsBadges pageStats={pageStats} size="md" />
                        </div>
                    )}
                    {showMarkdownEstimateLine && !showMarkdownEstimateBesidePageStats && (
                        <MarkdownStatLine
                            as="p"
                            tokenEstimate={parseUploadTokenEstimate ?? markdownTokenEstimate!}
                            charCount={
                                parseUploadTokenEstimate !== null
                                    ? markdownTrimmedCharCount(uploadedMarkdown!)
                                    : markdownTrimmedCharCount(scrapeMarkdown!)
                            }
                        />
                    )}
                    {isScraping && (
                        <p className="text-xs text-gray-500 tabular-nums">
                            {t('runDurationRunning', {
                                duration: formatDurationMs(liveElapsedMs),
                            })}
                        </p>
                    )}
                    {!isScraping && lastRunDurationMs !== null && (
                        <p className="text-xs text-gray-500 tabular-nums">
                            {t('runDurationComplete', {
                                duration: formatDurationMs(lastRunDurationMs),
                            })}
                        </p>
                    )}
                </div>
            </div>
            {showLlmMetricsUi &&
                hasScraped &&
                scrapeError === null &&
                scrapeUsage !== null && (
                    <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                        <p className="text-sm text-gray-600 tabular-nums">
                            <span className="font-bold text-gray-900">{scrapeUsage.promptTokens}</span>
                            {' / '}
                            <span className="font-bold text-gray-900">{scrapeUsage.completionTokens}</span>
                            {' · '}
                            <span className="font-bold text-gray-900">
                                {scrapeUsage.reasoningTokens === null ? '—' : scrapeUsage.reasoningTokens}
                            </span>{' '}
                            {t('usageReasoningTokens')}
                            {' · '}
                            <span className="font-bold text-gray-900">{scrapeUsage.totalTokens}</span>{' '}
                            {t('usageTotalTokens')}
                        </p>
                    </div>
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
            {showSuggestedRacesPreview && !jsonView && (
                <SuggestedRacesPreview
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
                    acceptedIndexes={acceptedIndexes}
                    acceptingIndex={acceptingIndex}
                    onReject={handleReject}
                    rejectedIndexes={rejectedIndexes}
                    onSave={handleSave}
                />
            )}
            {batchSnapshot && (
                <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                    <p className="text-sm font-medium text-gray-900">
                        {t('bulk.statusSummary', {
                            completed: batchSnapshot.summary.completed,
                            failed: batchSnapshot.summary.failed,
                            total: batchSnapshot.summary.total,
                        })}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {t(`bulk.batchStatus.${batchSnapshot.batch.status}`)}
                    </p>
                </div>
            )}
            <BulkProcessTable
                rows={batchRows}
                onViewResult={handleViewBatchResult}
                viewingItemId={viewingBatchItemId}
            />
            {jsonView && hasScraped && !isScraping && scrapeError === null && (
                <div className="max-w-3xl flex flex-col gap-3">
                    <textarea
                        value={jsonEditorValue}
                        onChange={(e) => dispatch({ type: 'JSON_EDITED', value: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white p-4 font-mono text-xs text-gray-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 resize-y"
                        rows={30}
                        spellCheck={false}
                    />
                    {jsonEditorError && (
                        <p className="text-xs text-red-600">{jsonEditorError}</p>
                    )}
                    <div className="flex gap-2">
                        <Button type="button" onClick={handleApplyJson}>
                            {t('applyJson')}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => dispatch({ type: 'JSON_TAB_CLOSED' })}>
                            {t('cancelJson')}
                        </Button>
                    </div>
                </div>
            )}
            <RaceConflictModal
                isOpen={isConflictModalOpen}
                onClose={closeConflictModal}
                conflicts={importConflicts}
            />
        </div>
    );
}

'use client';

import { useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FormSelect } from '@/components/ui/form-select';
import { Combobox } from '@/components/ui/combobox';
import type { ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
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
import type { RaceImportResult, RaceImportStep } from '@/types/races-import-api.types';
import type { TrailRace } from '@/types/trail-race-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PendingRace } from '@/types/pending-race.types';
import { XCircle, RefreshCw, Sparkles, FileText, ImageIcon, X } from 'lucide-react';

type ScrapeWorkflow = 'crawlMdOnly' | 'llmFromFile' | 'crawlSiteExtract' | 'autopilot';

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
    autopilotFallbackUsed: boolean | null;
    persistedPipelineRows: PersistedPipelineRow[];
}

type ScrapeAction =
    // Workflow start
    | { type: 'SCRAPE_START' }
    | { type: 'CRAWL_SITE_EXTRACT_START' }
    | { type: 'AUTOPILOT_START' }
    // Run completion
    | { type: 'AGENT_SUCCESS'; races: TrailRace[]; rawModelOutput: string; usage: OpenRouterScrapeUsage | null; markdown?: string }
    | { type: 'IMPORT_SUCCESS'; result: RaceImportResult; persistedRows: PersistedPipelineRow[]; showPipeline: boolean }
    | { type: 'SCRAPE_ERROR'; error: string }
    | { type: 'SCRAPE_COMPLETE'; durationMs: number }
    // UI / reset
    | { type: 'PIPELINE_HIDDEN' }
    | { type: 'RESULTS_CLEARED' }
    | { type: 'PREVIEW_LOADED'; scrapedRaces: TrailRace[]; markdown: string; rawModelOutput: string | null; usage: OpenRouterScrapeUsage | null; pageStats: PageStats | null; showPipeline: boolean; durationMs: number }
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
    autopilotFallbackUsed: null,
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
        case 'AUTOPILOT_START':
            return {
                ...state,
                isScraping: true,
                lastRunDurationMs: null,
                scrapeError: null,
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
                autopilotFallbackUsed: false,
                scrapePhase: 'crawling',
            };
        // Run completion
        case 'AGENT_SUCCESS':
            return {
                ...state,
                scrapedRaces: action.races,
                rawModelOutput: action.rawModelOutput,
                scrapeUsage: action.usage,
                hasScraped: true,
                ...(action.markdown !== undefined ? { scrapeMarkdown: action.markdown } : {}),
            };
        case 'IMPORT_SUCCESS':
            return {
                ...state,
                scrapedRaces: action.result.races,
                rawModelOutput: action.result.rawModelOutput,
                scrapeUsage: action.result.usage,
                pageStats: action.result.pageStats,
                scrapeMarkdown: action.result.markdown,
                hasScraped: true,
                fullPipelineUiActive: action.showPipeline,
                autopilotFallbackUsed: action.result.fallbackUsed,
                persistedPipelineRows: action.persistedRows,
                scrapePhase: action.result.workflow === 'crawlMdOnly' ? 'crawling' : 'llm',
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

function buildAutopilotFallbackRows(result: RaceImportResult): PersistedPipelineRow[] {
    if (result.workflow !== 'autopilot' || result.fallbackUsed !== true) {
        return [];
    }

    const firstScrape = findStep(result.steps, 'scrapePage');
    const firstExtract = findStep(result.steps, 'extract');

    return [
        {
            kind: firstScrape?.status === 'failed' ? 'error' : 'success',
            titleKey: 'autopilotScrapeSuccess',
            durationMs: firstScrape?.durationMs ?? null,
            pageStats: firstScrape?.pageStats ?? null,
        },
        {
            kind: firstExtract?.status === 'failed' ? 'error' : 'success',
            titleKey: 'autopilotParseEmptyFallback',
            durationMs: firstExtract?.durationMs ?? null,
        },
    ];
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

    const fullPipelineCrawlStartedAtRef = useRef<number | null>(null);
    const fullPipelineCrawlEndedAtRef = useRef<number | null>(null);
    const fullPipelineLlmStartedAtRef = useRef<number | null>(null);
    const fullPipelineLlmEndedAtRef = useRef<number | null>(null);

    const [workflow, setWorkflow] = useState<ScrapeWorkflow>('autopilot');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [selectedModelId, setSelectedModelId] = useState<OpenRouterScrapeModelId>(
        OPENROUTER_SCRAPE_MODEL_IDS[0],
    );
    const [selectedVisionModelId, setSelectedVisionModelId] = useState<OpenRouterVisionModelId>(
        OPENROUTER_VISION_MODEL_IDS[0],
    );

    const [state, dispatch] = useReducer(scrapeReducer, initialScrapeState);
    const {
        isScraping,
        scrapePhase,
        fullPipelineUiActive,
        lastRunDurationMs,
        scrapedRaces,
        scrapeError,
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
        bulkRows,
        autopilotFallbackUsed,
        persistedPipelineRows,
    } = state;

    const { elapsedMs: liveElapsedMs, startedAtRef: runStartedAtRef } = useLiveTimer(isScraping);

    const resetScrapeResults = (): void => {
        dispatch({ type: 'RESULTS_CLEARED' });
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

    const canRunScrape =
        !isScraping &&
        (workflow === 'crawlMdOnly' || workflow === 'crawlSiteExtract' || workflow === 'autopilot'
            ? isValidUrl(websiteUrl)
            : uploadKind === 'images'
                ? uploadedImages.length > 0
                : Boolean(uploadedMarkdown && uploadedMarkdown.length > 0));

    const clearFullPipelineStepRefs = (): void => {
        fullPipelineCrawlStartedAtRef.current = null;
        fullPipelineCrawlEndedAtRef.current = null;
        fullPipelineLlmStartedAtRef.current = null;
        fullPipelineLlmEndedAtRef.current = null;
    };

    const handleWorkflowChange = (next: ScrapeWorkflow): void => {
        if (next !== 'crawlSiteExtract') {
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

    const setCompletedImportStepRefs = (result: RaceImportResult): void => {
        const isFallback = result.workflow === 'autopilot' && result.fallbackUsed === true;
        const crawlStep =
            result.workflow === 'autopilot'
                ? findStep(result.steps, isFallback ? 'crawlSite' : 'scrapePage')
                : findStep(result.steps, 'crawlSite');
        const extractStep = findStep(result.steps, 'extract', isFallback ? 1 : 0);

        fullPipelineCrawlStartedAtRef.current = crawlStep ? 0 : null;
        fullPipelineCrawlEndedAtRef.current = crawlStep ? crawlStep.durationMs : null;
        fullPipelineLlmStartedAtRef.current = extractStep ? 0 : null;
        fullPipelineLlmEndedAtRef.current = extractStep ? extractStep.durationMs : null;
    };


    const handleRunWorkflow = async () => {
        runStartedAtRef.current = performance.now();

        try {
            if (workflow === 'autopilot' || workflow === 'crawlSiteExtract' || workflow === 'crawlMdOnly') {
                const normalizedUrl = normalizeUrl(websiteUrl.trim());

                if (workflow === 'autopilot') {
                    dispatch({ type: 'AUTOPILOT_START' });
                    fullPipelineCrawlStartedAtRef.current = performance.now();
                    fullPipelineCrawlEndedAtRef.current = null;
                    fullPipelineLlmStartedAtRef.current = null;
                    fullPipelineLlmEndedAtRef.current = null;
                } else if (workflow === 'crawlSiteExtract') {
                    dispatch({ type: 'CRAWL_SITE_EXTRACT_START' });
                    fullPipelineCrawlStartedAtRef.current = performance.now();
                    fullPipelineCrawlEndedAtRef.current = null;
                    fullPipelineLlmStartedAtRef.current = null;
                    fullPipelineLlmEndedAtRef.current = null;
                } else {
                    dispatch({ type: 'SCRAPE_START' });
                    clearFullPipelineStepRefs();
                }

                const data = await runRaceImport(
                    workflow === 'crawlMdOnly'
                        ? { workflow, websiteUrl: normalizedUrl }
                        : { workflow, websiteUrl: normalizedUrl, model: selectedModelId },
                );

                setCompletedImportStepRefs(data);
                dispatch({
                    type: 'IMPORT_SUCCESS',
                    result: data,
                    persistedRows: buildAutopilotFallbackRows(data),
                    showPipeline: workflow === 'autopilot' || workflow === 'crawlSiteExtract',
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
                    dispatch({ type: 'AGENT_SUCCESS', races: data.races, rawModelOutput: data.rawModelOutput, usage: data.usage });
                } else {
                    const markdownBody = uploadedMarkdown;
                    if (!markdownBody) return;
                    const data = await runTrailRaceAgent({
                        mode: 'markdown',
                        markdown: markdownBody,
                        model: selectedModelId,
                    });
                    dispatch({ type: 'AGENT_SUCCESS', races: data.races, rawModelOutput: data.rawModelOutput, usage: data.usage, markdown: data.markdown });
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('scrapeError');
            dispatch({ type: 'SCRAPE_ERROR', error: errorMessage });
            toast.error(t('scrapeError'));
        } finally {
            if (
                fullPipelineLlmStartedAtRef.current !== null &&
                fullPipelineLlmEndedAtRef.current === null
            ) {
                fullPipelineLlmEndedAtRef.current = performance.now();
            }
            const startedAt = runStartedAtRef.current;
            const durationMs =
                startedAt !== null ? Math.round(performance.now() - startedAt) : 0;
            dispatch({ type: 'SCRAPE_COMPLETE', durationMs });
            runStartedAtRef.current = null;
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
        const isCrawlMdOnly = workflow === 'crawlMdOnly';
        dispatch({
            type: 'PREVIEW_LOADED',
            durationMs: DUMMY_LAST_RUN_DURATION_MS,
            scrapedRaces: isCrawlMdOnly ? [] : [...DUMMY_SCRAPED_RACES],
            markdown: DUMMY_SCRAPE_MARKDOWN,
            rawModelOutput: isCrawlMdOnly ? null : DUMMY_RAW_MODEL_OUTPUT,
            usage: isCrawlMdOnly ? null : { ...DUMMY_SCRAPE_USAGE },
            pageStats: workflow === 'llmFromFile' ? null : { ...DUMMY_CRAWL_PAGE_STATS },
            showPipeline: workflow === 'crawlSiteExtract',
        });
    };

    const handleRestart = (): void => {
        if (isScraping) return;
        setWebsiteUrl('');
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
        workflow !== 'crawlMdOnly'
            ? isScraping || hasScraped
            : hasScraped && scrapeError !== null;

    const primaryButtonLabel =
        workflow === 'crawlMdOnly' ? t('crawlMdButton') :
            workflow === 'autopilot' ? t('bulk.runButton') :
                t('scrapeButton');

    const primaryLoadingLabel =
        workflow === 'crawlMdOnly'
            ? t('crawlingMarkdown')
            : workflow === 'autopilot'
                ? t('bulk.running')
                : workflow === 'crawlSiteExtract' && scrapePhase === 'crawling'
                    ? t('crawlingMarkdown')
                    : t('scraping');

    const showLlmMetricsUi = workflow !== 'crawlMdOnly';

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
        if ((workflow !== 'crawlSiteExtract' && workflow !== 'autopilot') || !fullPipelineUiActive) {
            return null;
        }
        if (!isScraping && !hasScraped) {
            return null;
        }
        let row1: FullPipelineRowConfig;
        if (isScraping && scrapePhase === 'crawling') {
            const autopilotLoadingKey = autopilotFallbackUsed ? 'fullPipelineCrawlingWebsite' : 'autopilotProcessing';
            row1 = { kind: 'loading', titleKey: workflow === 'autopilot' ? autopilotLoadingKey : 'fullPipelineCrawlingWebsite' };
        } else if (isScraping && scrapePhase === 'llm') {
            row1 = { kind: 'success', titleKey: 'fullPipelineCrawlSuccess' };
        } else if (!isScraping && hasScraped && scrapeError && !scrapeMarkdown) {
            row1 = { kind: 'error', titleKey: 'crawlError', errorDetail: scrapeError };
        } else if (!isScraping && hasScraped && scrapeError && scrapeMarkdown) {
            row1 = { kind: 'success', titleKey: 'fullPipelineCrawlSuccess' };
        } else if (!isScraping && hasScraped && !scrapeError) {
            const successKey = workflow === 'autopilot' && autopilotFallbackUsed === false
                ? 'autopilotScrapeSuccess'
                : 'fullPipelineCrawlSuccess';
            row1 = { kind: 'success', titleKey: successKey };
        } else if (isScraping) {
            row1 = { kind: 'loading', titleKey: 'fullPipelineCrawlingWebsite' };
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
        autopilotFallbackUsed,
    ]);

    const showMarkdownEstimateBesidePageStats =
        (workflow === 'crawlSiteExtract' || workflow === 'autopilot') &&
        fullPipelineSteps !== null &&
        pageStats !== null &&
        showMarkdownEstimateLine;

    const fullPipelineCrawlStepMs = useMemo((): number | null => {
        // Keep this memo recalculating on the live timer tick while crawling is active.
        void liveElapsedMs;
        if ((workflow !== 'crawlSiteExtract' && workflow !== 'autopilot') || !fullPipelineUiActive) {
            return null;
        }
        if (fullPipelineCrawlStartedAtRef.current === null) {
            return null;
        }
        if (fullPipelineCrawlEndedAtRef.current !== null) {
            return Math.round(
                fullPipelineCrawlEndedAtRef.current - fullPipelineCrawlStartedAtRef.current,
            );
        }
        if (isScraping && scrapePhase === 'crawling') {
            return Math.round(performance.now() - fullPipelineCrawlStartedAtRef.current);
        }
        return null;
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs]);

    const fullPipelineLlmStepMs = useMemo((): number | null => {
        // Keep this memo recalculating on the live timer tick while LLM extraction is active.
        void liveElapsedMs;
        if ((workflow !== 'crawlSiteExtract' && workflow !== 'autopilot') || !fullPipelineUiActive) {
            return null;
        }
        if (fullPipelineLlmStartedAtRef.current === null) {
            return null;
        }
        if (fullPipelineLlmEndedAtRef.current !== null) {
            return Math.round(
                fullPipelineLlmEndedAtRef.current - fullPipelineLlmStartedAtRef.current,
            );
        }
        if (isScraping && scrapePhase === 'llm') {
            return Math.round(performance.now() - fullPipelineLlmStartedAtRef.current);
        }
        return null;
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs]);

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
                                id: 'autopilot',
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Sparkles className="size-4" strokeWidth={1.5} />
                                        {t('workflowAutopilot')}
                                    </span>
                                ),
                            },
                            { id: 'crawlSiteExtract', label: t('workflowCrawlAndLlm') },
                            { id: 'crawlMdOnly', label: t('workflowCrawlMdOnly') },
                            { id: 'llmFromFile', label: t('workflowLlmFromFile') },
                        ]}
                        activeId={workflow}
                        onChange={(id) => handleWorkflowChange(id as ScrapeWorkflow)}
                        disabled={isScraping}
                    />

                    {(workflow === 'crawlMdOnly' || workflow === 'crawlSiteExtract' || workflow === 'autopilot') && (
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
                                            {t('imageCount', { count: uploadedImages.length })}
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

                    {(workflow === 'crawlSiteExtract' || workflow === 'autopilot' || (workflow === 'llmFromFile' && uploadKind !== 'images')) && (
                        <FormSelect
                            id="openrouterModel"
                            label={t('modelLabel')}
                            value={selectedModelId}
                            onChange={(e) =>
                                setSelectedModelId(e.target.value as OpenRouterScrapeModelId)
                            }
                            disabled={isScraping}
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
                            disabled={!canRunScrape}
                            isLoading={isScraping}
                            loadingText={primaryLoadingLabel}
                        >
                            {primaryButtonLabel}
                        </Button>
                        {scrapeMarkdown && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleDownloadMarkdown}
                            >
                                {t('downloadMarkdown')}
                            </Button>
                        )}
                        {rawModelOutput !== null && rawModelOutput !== '' && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleDownloadRawModelOutput}
                            >
                                {t('downloadRawResponse')}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleLoadDummyPreview}
                            disabled={isScraping}
                        >
                            {t('loadDummyPreview')}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleRestart}
                            disabled={isScraping}
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
                                        {(workflow === 'crawlSiteExtract' || workflow === 'autopilot') && pageStats !== null && (
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
                    {workflow === 'crawlMdOnly' && pageStats !== null && (
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
                    onAccept={handleAccept}
                    acceptedIndexes={acceptedIndexes}
                    acceptingIndex={acceptingIndex}
                    onReject={handleReject}
                    rejectedIndexes={rejectedIndexes}
                    onSave={handleSave}
                />
            )}
            <BulkProcessTable rows={bulkRows} />
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
        </div>
    );
}

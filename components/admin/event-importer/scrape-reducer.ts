import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';
import type { PersistedImportPipelineRow } from '@/components/admin/import-pipeline-progress';
import type { EventImportResult } from '@/types/events-import-api.types';
import type {
    TrailEventAgentEvent,
    TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';

export type ScrapeWorkflow = 'bulk' | 'full' | 'ingest' | 'llmFromFile' | 'research';
export type ScrapeSourceMode = 'scrapePage' | 'crawlSite';

export type ScrapePhase = 'idle' | 'crawling' | 'llm';

export interface ScrapeState {
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

export function normalizeRaceTierArrays(
    races: TrailEventAgentRace[],
): TrailEventAgentRace[] {
    return races.map((race) => ({
        ...race,
        tiers: Array.isArray(race.tiers) ? race.tiers : [],
    }));
}

export type ScrapeAction =
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

export const initialScrapeState: ScrapeState = {
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

export function scrapeReducer(state: ScrapeState, action: ScrapeAction): ScrapeState {
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

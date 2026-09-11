import {
    normalizeRaceTierArrays,
    initialScrapeState,
    type ScrapeAction,
    type ScrapeState,
} from '@/components/admin/event-importer/scrape-types';

export {
    type ScrapeWorkflow,
    type ScrapeSourceMode,
    type ScrapePhase,
    type ScrapeState,
    type ScrapeAction,
    normalizeRaceTierArrays,
    initialScrapeState,
} from '@/components/admin/event-importer/scrape-types';

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
                crawlStepStartedAt: null,
                crawlStepEndedAt: null,
                llmStepStartedAt: null,
                llmStepEndedAt: null,
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
                crawlStepStartedAt: action.startedAt,
                crawlStepEndedAt: null,
                llmStepStartedAt: null,
                llmStepEndedAt: null,
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
                crawlStepStartedAt: action.crawlStepStartedAt,
                crawlStepEndedAt: action.crawlStepEndedAt,
                llmStepStartedAt: action.llmStepStartedAt,
                llmStepEndedAt: action.llmStepEndedAt,
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
            return {
                ...state,
                fullPipelineUiActive: false,
                crawlStepStartedAt: null,
                crawlStepEndedAt: null,
                llmStepStartedAt: null,
                llmStepEndedAt: null,
            };
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
                crawlStepStartedAt: null,
                crawlStepEndedAt: null,
                llmStepStartedAt: null,
                llmStepEndedAt: null,
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

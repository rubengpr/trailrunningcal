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
    crawlStepStartedAt: number | null;
    crawlStepEndedAt: number | null;
    llmStepStartedAt: number | null;
    llmStepEndedAt: number | null;
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
    | { type: 'CRAWL_SITE_EXTRACT_START'; startedAt: number }
    // Run completion
    | { type: 'AGENT_SUCCESS'; event: TrailEventAgentEvent | null; races: TrailEventAgentRace[]; errorMessage: string | null; rawModelOutput: string; usage: OpenRouterScrapeUsage | null; markdown?: string }
    | { type: 'IMPORT_SUCCESS'; result: EventImportResult; persistedRows: PersistedImportPipelineRow[]; showPipeline: boolean; crawlStepStartedAt: number | null; crawlStepEndedAt: number | null; llmStepStartedAt: number | null; llmStepEndedAt: number | null }
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
    crawlStepStartedAt: null,
    crawlStepEndedAt: null,
    llmStepStartedAt: null,
    llmStepEndedAt: null,
};

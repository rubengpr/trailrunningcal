import type { ImportPipelineRowConfig } from '@/components/admin/import-pipeline-progress';
import type { ScrapePhase, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';

interface FullPipelineStepsParams {
    workflow: ScrapeWorkflow;
    fullPipelineUiActive: boolean;
    isScraping: boolean;
    hasScraped: boolean;
    scrapePhase: ScrapePhase;
    scrapeError: string | null;
    scrapeMarkdown: string | null;
}

export function computeFullPipelineSteps({
    workflow,
    fullPipelineUiActive,
    isScraping,
    hasScraped,
    scrapePhase,
    scrapeError,
    scrapeMarkdown,
}: FullPipelineStepsParams): { row1: ImportPipelineRowConfig; row2: ImportPipelineRowConfig } | null {
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
}

interface FullPipelineStepMsParams {
    workflow: ScrapeWorkflow;
    fullPipelineUiActive: boolean;
    isScraping: boolean;
    scrapePhase: ScrapePhase;
    startedAt: number | null;
    endedAt: number | null;
}

export function computeFullPipelineCrawlStepMs({
    workflow,
    fullPipelineUiActive,
    isScraping,
    scrapePhase,
    startedAt,
    endedAt,
}: FullPipelineStepMsParams): number | null {
    if (workflow !== 'full' || !fullPipelineUiActive) {
        return null;
    }
    if (startedAt === null) {
        return null;
    }
    if (endedAt !== null) {
        return Math.round(endedAt - startedAt);
    }
    if (isScraping && scrapePhase === 'crawling') {
        return Math.round(performance.now() - startedAt);
    }
    return null;
}

export function computeFullPipelineLlmStepMs({
    workflow,
    fullPipelineUiActive,
    isScraping,
    scrapePhase,
    startedAt,
    endedAt,
}: FullPipelineStepMsParams): number | null {
    if (workflow !== 'full' || !fullPipelineUiActive) {
        return null;
    }
    if (startedAt === null) {
        return null;
    }
    if (endedAt !== null) {
        return Math.round(endedAt - startedAt);
    }
    if (isScraping && scrapePhase === 'llm') {
        return Math.round(performance.now() - startedAt);
    }
    return null;
}

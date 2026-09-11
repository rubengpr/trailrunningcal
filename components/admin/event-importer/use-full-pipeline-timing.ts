import { useMemo } from 'react';
import type { ScrapePhase, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';
import {
    computeFullPipelineSteps,
    computeFullPipelineCrawlStepMs,
    computeFullPipelineLlmStepMs,
} from '@/components/admin/event-importer/full-pipeline-steps';

interface UseFullPipelineTimingParams {
    workflow: ScrapeWorkflow;
    fullPipelineUiActive: boolean;
    isScraping: boolean;
    hasScraped: boolean;
    scrapePhase: ScrapePhase;
    scrapeError: string | null;
    scrapeMarkdown: string | null;
    liveElapsedMs: number;
    crawlStepStartedAt: number | null;
    crawlStepEndedAt: number | null;
    llmStepStartedAt: number | null;
    llmStepEndedAt: number | null;
}

export function useFullPipelineTiming({
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
}: UseFullPipelineTimingParams) {
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
            startedAt: crawlStepStartedAt,
            endedAt: crawlStepEndedAt,
        });
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs, crawlStepStartedAt, crawlStepEndedAt]);

    const fullPipelineLlmStepMs = useMemo(() => {
        // Keep this memo recalculating on the live timer tick while LLM extraction is active.
        void liveElapsedMs;
        return computeFullPipelineLlmStepMs({
            workflow,
            fullPipelineUiActive,
            isScraping,
            scrapePhase,
            startedAt: llmStepStartedAt,
            endedAt: llmStepEndedAt,
        });
    }, [workflow, fullPipelineUiActive, isScraping, scrapePhase, liveElapsedMs, llmStepStartedAt, llmStepEndedAt]);

    return { fullPipelineSteps, fullPipelineCrawlStepMs, fullPipelineLlmStepMs };
}

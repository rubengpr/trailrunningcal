import type { useTranslations } from 'next-intl';
import { normalizeUrl } from '@/lib/validation';
import type { EventImportStep } from '@/types/events-import-api.types';
import type { ScrapePhase, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';

export const RESEARCH_ERROR_TRANSLATION_KEYS: Record<string, string> = {
    api_error: 'research.errors.apiError',
    incomplete_response: 'research.errors.incompleteResponse',
    parse_error: 'research.errors.parseError',
    processing_error: 'research.errors.processingError',
    refusal: 'research.errors.refusal',
    scheduling_error: 'research.errors.schedulingError',
    timeout: 'research.errors.timeout',
};

export function isValidUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
        new URL(normalizeUrl(trimmed));
        return true;
    } catch {
        return false;
    }
}

export function findStep(
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

export function computeShowImportPreview(
    workflow: ScrapeWorkflow,
    isScraping: boolean,
    hasScraped: boolean,
    scrapeError: string | null,
): boolean {
    return workflow === 'bulk' || workflow === 'research'
        ? false
        : workflow !== 'ingest'
        ? isScraping || hasScraped
        : hasScraped && scrapeError !== null;
}

export function computePrimaryLoadingLabel(
    t: ReturnType<typeof useTranslations>,
    workflow: ScrapeWorkflow,
    scrapePhase: ScrapePhase,
): string {
    return workflow === 'ingest'
        ? t('crawlingMarkdown')
        : workflow === 'bulk'
            ? t('bulk.running')
            : workflow === 'research'
                ? t('research.running')
            : workflow === 'full' && scrapePhase === 'crawling'
                ? t('crawlingMarkdown')
                : t('scraping');
}

export function computeShowLlmMetricsUi(workflow: ScrapeWorkflow): boolean {
    return workflow !== 'ingest' && workflow !== 'bulk' && workflow !== 'research';
}

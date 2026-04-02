'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/form-select';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { DUMMY_SCRAPED_RACES, ScrapedRacesPreview } from '@/components/race/scraped-races-preview';
import {
    DUMMY_CRAWL_PAGE_STATS,
    DUMMY_LAST_RUN_DURATION_MS,
    DUMMY_RAW_MODEL_OUTPUT,
    DUMMY_SCRAPE_MARKDOWN,
    DUMMY_SCRAPE_USAGE,
} from '@/lib/fixtures/dummy-scrape-preview';
import {
    crawlEventWebsiteMarkdown,
    scrapeRaces,
    acceptScrapedRace,
} from '@/lib/api/races';
import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/openrouter/scrape-models';
import type { OpenRouterScrapeModelId } from '@/lib/openrouter/scrape-models';
import { formatDurationMs } from '@/lib/format-duration';
import {
    estimateMarkdownTokensHeuristic,
    markdownTrimmedCharCount,
} from '@/lib/scrape-markdown-token-estimate';
import { normalizeUrl } from '@/lib/validation';
import type { CrawlPageStats } from '@/types/races-scrape-api.types';
import type { TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';

type ScrapeWorkflow = 'crawlMdOnly' | 'llmFromMd' | 'crawlAndLlm';

function RestartIcon({ className = 'h-5 w-5' }: { className?: string }): React.ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
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

export function ScrapePageContent() {
    const t = useTranslations('admin.races.scrape');

    const markdownFileInputRef = useRef<HTMLInputElement>(null);
    const runStartedAtRef = useRef<number | null>(null);

    const [workflow, setWorkflow] = useState<ScrapeWorkflow>('crawlAndLlm');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [uploadedMarkdown, setUploadedMarkdown] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    const [selectedModelId, setSelectedModelId] = useState<OpenRouterScrapeModelId>(
        OPENROUTER_SCRAPE_MODEL_IDS[0],
    );
    const [isScraping, setIsScraping] = useState(false);
    const [liveElapsedMs, setLiveElapsedMs] = useState(0);
    const [lastRunDurationMs, setLastRunDurationMs] = useState<number | null>(null);
    const [scrapedRaces, setScrapedRaces] = useState<TrailRaceAgentRaceRow[]>([]);
    const [scrapeError, setScrapeError] = useState<string | null>(null);
    const [hasScraped, setHasScraped] = useState(false);

    const [scrapeMarkdown, setScrapeMarkdown] = useState<string | null>(null);
    const [rawModelOutput, setRawModelOutput] = useState<string | null>(null);
    const [scrapeUsage, setScrapeUsage] = useState<OpenRouterScrapeUsage | null>(null);
    const [crawlPageStats, setCrawlPageStats] = useState<CrawlPageStats | null>(null);

    const [acceptedIndexes, setAcceptedIndexes] = useState<Set<number>>(new Set());
    const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);
    const [rejectedIndexes, setRejectedIndexes] = useState<Set<number>>(new Set());

    const isValidUrl = (url: string): boolean => {
        const trimmed = url.trim();
        if (!trimmed) return false;
        try {
            new URL(normalizeUrl(trimmed));
            return true;
        } catch {
            return false;
        }
    };

    const canRunScrape =
        !isScraping &&
        (workflow === 'crawlMdOnly' || workflow === 'crawlAndLlm'
            ? isValidUrl(websiteUrl)
            : Boolean(uploadedMarkdown && uploadedMarkdown.length > 0));

    const handleWorkflowChange = (next: ScrapeWorkflow): void => {
        setWorkflow(next);
        if (next !== 'llmFromMd') {
            setUploadedMarkdown(null);
            setUploadedFileName(null);
            if (markdownFileInputRef.current) {
                markdownFileInputRef.current.value = '';
            }
        }
    };

    const handleMarkdownFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith('.md')) {
            toast.error(t('fileTypeErrorMd'));
            event.target.value = '';
            return;
        }
        try {
            const text = await file.text();
            setUploadedMarkdown(text);
            setUploadedFileName(file.name);
            setScrapeMarkdown(null);
            setRawModelOutput(null);
            setScrapeUsage(null);
            setCrawlPageStats(null);
            setHasScraped(false);
            setScrapeError(null);
            setScrapedRaces([]);
            setAcceptedIndexes(new Set());
            setRejectedIndexes(new Set());
        } catch {
            toast.error(t('scrapeError'));
            event.target.value = '';
        }
    };

    const handleClearMarkdownFile = (): void => {
        setUploadedMarkdown(null);
        setUploadedFileName(null);
        setScrapeMarkdown(null);
        setRawModelOutput(null);
        setScrapeUsage(null);
        setCrawlPageStats(null);
        setHasScraped(false);
        setScrapeError(null);
        setScrapedRaces([]);
        setAcceptedIndexes(new Set());
        setRejectedIndexes(new Set());
        if (markdownFileInputRef.current) {
            markdownFileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (!isScraping || runStartedAtRef.current === null) {
            return;
        }
        const tick = (): void => {
            setLiveElapsedMs(
                Math.round(performance.now() - runStartedAtRef.current!),
            );
        };
        tick();
        const intervalId = window.setInterval(tick, 100);
        return () => {
            window.clearInterval(intervalId);
        };
    }, [isScraping]);

    const handleScrape = async () => {
        runStartedAtRef.current = performance.now();
        setLiveElapsedMs(0);
        setLastRunDurationMs(null);
        setIsScraping(true);
        setScrapeError(null);
        setScrapedRaces([]);
        setHasScraped(false);
        setScrapeMarkdown(null);
        setRawModelOutput(null);
        setScrapeUsage(null);
        setCrawlPageStats(null);
        setAcceptedIndexes(new Set());
        setAcceptingIndex(null);
        setRejectedIndexes(new Set());

        try {
            if (workflow === 'crawlMdOnly') {
                const normalizedUrl = normalizeUrl(websiteUrl.trim());
                const data = await crawlEventWebsiteMarkdown(normalizedUrl);
                setScrapeMarkdown(data.markdown);
                setCrawlPageStats(data.crawlPageStats);
                setHasScraped(true);
                return;
            }

            if (workflow === 'llmFromMd') {
                const markdownBody = uploadedMarkdown;
                if (!markdownBody) {
                    return;
                }
                const data = await scrapeRaces({
                    mode: 'llmFromMarkdown',
                    markdown: markdownBody,
                    model: selectedModelId,
                });
                setScrapedRaces(data.races);
                setScrapeMarkdown(data.markdown);
                setRawModelOutput(data.rawModelOutput);
                setScrapeUsage(data.usage);
            } else {
                const normalizedUrl = normalizeUrl(websiteUrl.trim());
                const data = await scrapeRaces({
                    mode: 'crawlAndLlm',
                    websiteUrl: normalizedUrl,
                    model: selectedModelId,
                });
                setScrapedRaces(data.races);
                setScrapeMarkdown(data.markdown);
                setRawModelOutput(data.rawModelOutput);
                setScrapeUsage(data.usage);
                setCrawlPageStats(data.crawlPageStats);
            }
            setHasScraped(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('scrapeError');
            setScrapeError(errorMessage);
            setHasScraped(true);
            toast.error(t('scrapeError'));
        } finally {
            const startedAt = runStartedAtRef.current;
            const durationMs =
                startedAt !== null ? Math.round(performance.now() - startedAt) : 0;
            setLastRunDurationMs(durationMs);
            runStartedAtRef.current = null;
            setLiveElapsedMs(0);
            setIsScraping(false);
        }
    };

    const handleAccept = async (index: number) => {
        setAcceptingIndex(index);
        try {
            const normalizedUrl = normalizeUrl(websiteUrl.trim());
            await acceptScrapedRace(scrapedRaces[index], normalizedUrl);
            setAcceptedIndexes(prev => new Set(prev).add(index));
            toast.success(t('results.acceptSuccess'));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('results.acceptError');
            toast.error(errorMessage);
        } finally {
            setAcceptingIndex(null);
        }
    };

    const handleReject = (index: number) => {
        setRejectedIndexes(prev => new Set(prev).add(index));
        toast.success(t('results.rejectSuccess'));
    };

    const handleSave = (index: number, updatedRace: TrailRaceAgentRaceRow) => {
        setScrapedRaces(prev => prev.map((r, i) => i === index ? updatedRace : r));
    };

    const handleLoadDummyPreview = (): void => {
        setScrapeError(null);
        setHasScraped(true);
        setIsScraping(false);
        setAcceptedIndexes(new Set());
        setAcceptingIndex(null);
        setRejectedIndexes(new Set());
        setLiveElapsedMs(0);
        setLastRunDurationMs(DUMMY_LAST_RUN_DURATION_MS);
        runStartedAtRef.current = null;

        if (workflow === 'crawlMdOnly') {
            setScrapedRaces([]);
            setScrapeMarkdown(DUMMY_SCRAPE_MARKDOWN);
            setRawModelOutput(null);
            setScrapeUsage(null);
            setCrawlPageStats({ ...DUMMY_CRAWL_PAGE_STATS });
            return;
        }

        if (workflow === 'llmFromMd') {
            setCrawlPageStats(null);
        } else {
            setCrawlPageStats({ ...DUMMY_CRAWL_PAGE_STATS });
        }

        setScrapedRaces([...DUMMY_SCRAPED_RACES]);
        setScrapeMarkdown(DUMMY_SCRAPE_MARKDOWN);
        setRawModelOutput(DUMMY_RAW_MODEL_OUTPUT);
        setScrapeUsage({ ...DUMMY_SCRAPE_USAGE });
    };

    const handleRestart = (): void => {
        if (isScraping) {
            return;
        }
        setWebsiteUrl('');
        setUploadedMarkdown(null);
        setUploadedFileName(null);
        setLiveElapsedMs(0);
        setLastRunDurationMs(null);
        setScrapedRaces([]);
        setScrapeError(null);
        setHasScraped(false);
        setScrapeMarkdown(null);
        setRawModelOutput(null);
        setScrapeUsage(null);
        setCrawlPageStats(null);
        setAcceptedIndexes(new Set());
        setAcceptingIndex(null);
        setRejectedIndexes(new Set());
        runStartedAtRef.current = null;
        if (markdownFileInputRef.current) {
            markdownFileInputRef.current.value = '';
        }
    };

    const handleDownloadMarkdown = () => {
        if (!scrapeMarkdown) return;
        let downloadName: string;
        if (workflow === 'llmFromMd' && uploadedFileName) {
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

    const showScrapedRacesPreview =
        workflow !== 'crawlMdOnly'
            ? isScraping || hasScraped
            : hasScraped && scrapeError !== null;

    const primaryButtonLabel =
        workflow === 'crawlMdOnly' ? t('crawlMdButton') : t('scrapeButton');

    const primaryLoadingLabel =
        workflow === 'crawlMdOnly' ? t('crawlingMarkdown') : t('scraping');

    const markdownTokenEstimate = useMemo((): number | null => {
        if (scrapeMarkdown === null || scrapeMarkdown === '') {
            return null;
        }
        return estimateMarkdownTokensHeuristic(scrapeMarkdown);
    }, [scrapeMarkdown]);

    /** Parse: estimate from upload; hidden once scrapeMarkdown exists (same row as post-scrape estimate below buttons). */
    const parseUploadTokenEstimate = useMemo((): number | null => {
        if (workflow !== 'llmFromMd') {
            return null;
        }
        if (uploadedMarkdown === null || uploadedMarkdown === '') {
            return null;
        }
        if (scrapeMarkdown !== null && scrapeMarkdown !== '') {
            return null;
        }
        return estimateMarkdownTokensHeuristic(uploadedMarkdown);
    }, [workflow, uploadedMarkdown, scrapeMarkdown]);

    /** Token usage and estimado: Parse + Full (LLM), not crawl-only. Run duration is shown for all workflows. */
    const showLlmMetricsUi = workflow !== 'crawlMdOnly';

    return (
        <div className="flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />
            <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="space-y-6">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/80 p-1">
                        <button
                            type="button"
                            onClick={() => handleWorkflowChange('crawlAndLlm')}
                            disabled={isScraping}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${workflow === 'crawlAndLlm'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {t('workflowCrawlAndLlm')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWorkflowChange('crawlMdOnly')}
                            disabled={isScraping}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${workflow === 'crawlMdOnly'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {t('workflowCrawlMdOnly')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWorkflowChange('llmFromMd')}
                            disabled={isScraping}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${workflow === 'llmFromMd'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {t('workflowLlmFromMd')}
                        </button>
                    </div>

                    {(workflow === 'crawlMdOnly' || workflow === 'crawlAndLlm') && (
                        <FormInput
                            id="websiteUrl"
                            label={t('websiteUrlLabel')}
                            type="url"
                            value={websiteUrl}
                            placeholder={t('websiteUrlPlaceholder')}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            disabled={isScraping}
                        />
                    )}

                    {workflow === 'llmFromMd' && (
                        <>
                            <div className="grid gap-2 w-full">
                                <label htmlFor="markdownFile" className="text-sm font-medium leading-none text-gray-900">
                                    {t('fileUploadLabel')}
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                    <input
                                        ref={markdownFileInputRef}
                                        id="markdownFile"
                                        type="file"
                                        accept=".md,text/markdown,text/plain"
                                        className="sr-only"
                                        onChange={handleMarkdownFileChange}
                                        disabled={isScraping}
                                    />
                                    <label
                                        htmlFor="markdownFile"
                                        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                                    >
                                        {t('selectMarkdownFile')}
                                    </label>
                                    {uploadedFileName && (
                                        <>
                                            <span className="text-sm text-gray-600 truncate max-w-full sm:max-w-md">
                                                {uploadedFileName}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={handleClearMarkdownFile}
                                                disabled={isScraping}
                                            >
                                                {t('clearFile')}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <FormInput
                                id="websiteUrlForAccept"
                                label={t('eventUrlForAcceptLabel')}
                                helperText={t('urlForAcceptHint')}
                                type="url"
                                value={websiteUrl}
                                placeholder={t('websiteUrlPlaceholder')}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                disabled={isScraping}
                            />
                        </>
                    )}

                    {(workflow === 'llmFromMd' || workflow === 'crawlAndLlm') && (
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
                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                        <Button
                            type="button"
                            onClick={handleScrape}
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
                    {(workflow === 'crawlMdOnly' || workflow === 'crawlAndLlm') &&
                        crawlPageStats !== null && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-gray-200/80 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 tabular-nums">
                                {t('crawledPagesTotal', {
                                    scrapedPages: crawlPageStats.total,
                                })}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-green-200/80 bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 tabular-nums">
                                {t('crawledPagesHttpSuccess', {
                                    successPages: crawlPageStats.successCount,
                                })}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-red-200/80 bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 tabular-nums">
                                {t('crawledPagesHttpError', {
                                    errorPages: crawlPageStats.errorCount,
                                })}
                            </span>
                        </div>
                    )}
                    {showLlmMetricsUi &&
                        ((parseUploadTokenEstimate !== null && uploadedMarkdown !== null) ||
                            (markdownTokenEstimate !== null && scrapeMarkdown !== null)) && (
                        <p className="text-xs text-gray-500 tabular-nums">
                            {t('markdownStatEstimatedPrefix')}{' '}
                            <span className="font-bold">
                                {parseUploadTokenEstimate !== null
                                    ? parseUploadTokenEstimate
                                    : markdownTokenEstimate!}
                            </span>{' '}
                            {t('markdownStatTokensLabel')}
                            {' · '}
                            <span className="font-bold">
                                {parseUploadTokenEstimate !== null
                                    ? markdownTrimmedCharCount(uploadedMarkdown!)
                                    : markdownTrimmedCharCount(scrapeMarkdown!)}
                            </span>{' '}
                            {t('markdownStatCharactersLabel')}
                        </p>
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
            {showScrapedRacesPreview && (
                <ScrapedRacesPreview
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
        </div>
    );
}

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
import { OPENROUTER_SCRAPE_MODEL_IDS, OPENROUTER_VISION_MODEL_IDS } from '@/lib/openrouter/scrape-models';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/openrouter/scrape-models';
import { formatDurationMs } from '@/lib/format-duration';
import {
    estimateMarkdownTokensHeuristic,
    markdownTrimmedCharCount,
} from '@/lib/scrape-markdown-token-estimate';
import { normalizeUrl } from '@/lib/validation';
import type { CrawlPageStats } from '@/types/races-scrape-api.types';
import type { TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';

type ScrapeWorkflow = 'crawlMdOnly' | 'llmFromMd' | 'crawlAndLlm' | 'llmFromImages';

type ScrapePhase = 'idle' | 'crawling' | 'llm';

type FullPipelineRowKind = 'loading' | 'success' | 'error' | 'pending';

interface FullPipelineRowConfig {
    kind: FullPipelineRowKind;
    /** Translation key for title line (omit when kind is pending). */
    titleKey?: string;
    errorDetail?: string | null;
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
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-red-600"
                aria-hidden
            >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
            </svg>
        );
    }
    return (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-xs leading-none text-gray-300" aria-hidden>
            —
        </span>
    );
}

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
    const imageFileInputRef = useRef<HTMLInputElement>(null);
    const runStartedAtRef = useRef<number | null>(null);
    const fullPipelineCrawlStartedAtRef = useRef<number | null>(null);
    const fullPipelineCrawlEndedAtRef = useRef<number | null>(null);
    const fullPipelineLlmStartedAtRef = useRef<number | null>(null);
    const fullPipelineLlmEndedAtRef = useRef<number | null>(null);

    const [workflow, setWorkflow] = useState<ScrapeWorkflow>('crawlAndLlm');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [uploadedMarkdown, setUploadedMarkdown] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    const [selectedModelId, setSelectedModelId] = useState<OpenRouterScrapeModelId>(
        OPENROUTER_SCRAPE_MODEL_IDS[0],
    );
    const [selectedVisionModelId, setSelectedVisionModelId] = useState<OpenRouterVisionModelId>(
        OPENROUTER_VISION_MODEL_IDS[0],
    );
    const [uploadedImages, setUploadedImages] = useState<{ dataUrl: string; name: string }[]>([]);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapePhase, setScrapePhase] = useState<ScrapePhase>('idle');
    const [fullPipelineUiActive, setFullPipelineUiActive] = useState(false);
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
            : workflow === 'llmFromImages'
              ? uploadedImages.length > 0
              : Boolean(uploadedMarkdown && uploadedMarkdown.length > 0));

    const clearFullPipelineStepRefs = (): void => {
        fullPipelineCrawlStartedAtRef.current = null;
        fullPipelineCrawlEndedAtRef.current = null;
        fullPipelineLlmStartedAtRef.current = null;
        fullPipelineLlmEndedAtRef.current = null;
    };

    const handleWorkflowChange = (next: ScrapeWorkflow): void => {
        if (next !== 'crawlAndLlm') {
            setFullPipelineUiActive(false);
            clearFullPipelineStepRefs();
        }
        setWorkflow(next);
        if (next !== 'llmFromMd') {
            setUploadedMarkdown(null);
            setUploadedFileName(null);
            if (markdownFileInputRef.current) {
                markdownFileInputRef.current.value = '';
            }
        }
        if (next !== 'llmFromImages') {
            setUploadedImages([]);
            if (imageFileInputRef.current) {
                imageFileInputRef.current.value = '';
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

    const MAX_IMAGES_PER_REQUEST = 5;
    const MAX_IMAGE_RAW_BYTES = 20 * 1024 * 1024;
    const MAX_TOTAL_PAYLOAD_CHARS = 4 * 1024 * 1024;

    const compressImageToDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const MAX_W = 1920;
                const MAX_H = 1920;
                let { width, height } = img;
                if (width > MAX_W || height > MAX_H) {
                    const ratio = Math.min(MAX_W / width, MAX_H / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas unavailable')); return; }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = reject;
            img.src = objectUrl;
        });

    const handleImageFilesChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;

        try {
            const combined = [...uploadedImages];
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    toast.error(t('fileTypeErrorImage'));
                    event.target.value = '';
                    return;
                }
                if (file.size > MAX_IMAGE_RAW_BYTES) {
                    toast.error(t('imageSizeError'));
                    event.target.value = '';
                    return;
                }
                if (combined.length >= MAX_IMAGES_PER_REQUEST) {
                    toast.error(t('imageLimitError'));
                    event.target.value = '';
                    return;
                }
                const dataUrl = await compressImageToDataUrl(file);
                combined.push({ dataUrl, name: file.name });
            }

            const totalChars = combined.reduce((sum, img) => sum + img.dataUrl.length, 0);
            if (totalChars > MAX_TOTAL_PAYLOAD_CHARS) {
                toast.error(t('imageSizeError'));
                event.target.value = '';
                return;
            }

            setUploadedImages(combined);
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
        } finally {
            event.target.value = '';
        }
    };

    const handleRemoveImage = (index: number): void => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleClearImages = (): void => {
        setUploadedImages([]);
        setScrapeMarkdown(null);
        setRawModelOutput(null);
        setScrapeUsage(null);
        setCrawlPageStats(null);
        setHasScraped(false);
        setScrapeError(null);
        setScrapedRaces([]);
        setAcceptedIndexes(new Set());
        setRejectedIndexes(new Set());
        if (imageFileInputRef.current) {
            imageFileInputRef.current.value = '';
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
        if (workflow === 'crawlAndLlm') {
            setFullPipelineUiActive(true);
            setScrapePhase('crawling');
            fullPipelineCrawlStartedAtRef.current = performance.now();
            fullPipelineCrawlEndedAtRef.current = null;
            fullPipelineLlmStartedAtRef.current = null;
            fullPipelineLlmEndedAtRef.current = null;
        } else {
            setFullPipelineUiActive(false);
            setScrapePhase('idle');
            clearFullPipelineStepRefs();
        }
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

            if (workflow === 'llmFromImages') {
                if (uploadedImages.length === 0) {
                    return;
                }
                const data = await scrapeRaces({
                    mode: 'llmFromImages',
                    images: uploadedImages.map(img => img.dataUrl),
                    model: selectedVisionModelId,
                });
                setScrapedRaces(data.races);
                setRawModelOutput(data.rawModelOutput);
                setScrapeUsage(data.usage);
            } else if (workflow === 'llmFromMd') {
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
                let crawlData;
                try {
                    crawlData = await crawlEventWebsiteMarkdown(normalizedUrl);
                } catch (crawlErr) {
                    fullPipelineCrawlEndedAtRef.current = performance.now();
                    const errorMessage =
                        crawlErr instanceof Error ? crawlErr.message : t('crawlError');
                    setScrapeError(errorMessage);
                    setHasScraped(true);
                    toast.error(t('crawlError'));
                    return;
                }
                const crawlEndedAt = performance.now();
                fullPipelineCrawlEndedAtRef.current = crawlEndedAt;
                fullPipelineLlmStartedAtRef.current = crawlEndedAt;
                setScrapeMarkdown(crawlData.markdown);
                setCrawlPageStats(crawlData.crawlPageStats);
                setScrapePhase('llm');
                let llmData;
                try {
                    llmData = await scrapeRaces({
                        mode: 'llmFromMarkdown',
                        markdown: crawlData.markdown,
                        model: selectedModelId,
                    });
                } catch (llmErr) {
                    fullPipelineLlmEndedAtRef.current = performance.now();
                    const errorMessage =
                        llmErr instanceof Error ? llmErr.message : t('llmError');
                    setScrapeError(errorMessage);
                    setHasScraped(true);
                    toast.error(t('llmError'));
                    return;
                }
                setScrapedRaces(llmData.races);
                setScrapeMarkdown(llmData.markdown);
                setRawModelOutput(llmData.rawModelOutput);
                setScrapeUsage(llmData.usage);
            }
            setHasScraped(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('scrapeError');
            setScrapeError(errorMessage);
            setHasScraped(true);
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
            setLastRunDurationMs(durationMs);
            runStartedAtRef.current = null;
            setLiveElapsedMs(0);
            setScrapePhase('idle');
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
        clearFullPipelineStepRefs();
        setScrapeError(null);
        setHasScraped(true);
        setIsScraping(false);
        setScrapePhase('idle');
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
        if (workflow === 'crawlAndLlm') {
            setFullPipelineUiActive(true);
        }
    };

    const handleRestart = (): void => {
        if (isScraping) {
            return;
        }
        setWebsiteUrl('');
        setUploadedMarkdown(null);
        setUploadedFileName(null);
        setUploadedImages([]);
        if (imageFileInputRef.current) {
            imageFileInputRef.current.value = '';
        }
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
        setScrapePhase('idle');
        setFullPipelineUiActive(false);
        clearFullPipelineStepRefs();
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
        workflow === 'crawlMdOnly'
            ? t('crawlingMarkdown')
            : workflow === 'crawlAndLlm' && scrapePhase === 'crawling'
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

    const showMarkdownEstimateLine =
        showLlmMetricsUi &&
        ((parseUploadTokenEstimate !== null && uploadedMarkdown !== null) ||
            (markdownTokenEstimate !== null && scrapeMarkdown !== null));

    const fullPipelineSteps = useMemo((): {
        row1: FullPipelineRowConfig;
        row2: FullPipelineRowConfig;
    } | null => {
        if (workflow !== 'crawlAndLlm' || !fullPipelineUiActive) {
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
    ]);

    const showMarkdownEstimateBesideCrawlPageStats =
        workflow === 'crawlAndLlm' &&
        fullPipelineSteps !== null &&
        crawlPageStats !== null &&
        showMarkdownEstimateLine;

    const fullPipelineCrawlStepMs = useMemo((): number | null => {
        if (workflow !== 'crawlAndLlm' || !fullPipelineUiActive) {
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
        if (workflow !== 'crawlAndLlm' || !fullPipelineUiActive) {
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
                        <button
                            type="button"
                            onClick={() => handleWorkflowChange('llmFromImages')}
                            disabled={isScraping}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${workflow === 'llmFromImages'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {t('workflowLlmFromImages')}
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

                    {/* IMAGE UPLOAD - shown for llmFromImages workflow */}
                    {workflow === 'llmFromImages' && (
                        <>
                            <div className="grid gap-2 w-full">
                                <label htmlFor="imageFiles" className="text-sm font-medium leading-none text-gray-900">
                                    {t('imageUploadLabel')}
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                    <input
                                        ref={imageFileInputRef}
                                        id="imageFiles"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="sr-only"
                                        onChange={handleImageFilesChange}
                                        disabled={isScraping}
                                    />
                                    <label
                                        htmlFor="imageFiles"
                                        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                                    >
                                        {t('selectImageFiles')}
                                    </label>
                                    {uploadedImages.length > 0 && (
                                        <>
                                            <span className="text-sm text-gray-600">
                                                {t('imageCount', { count: uploadedImages.length })}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={handleClearImages}
                                                disabled={isScraping}
                                            >
                                                {t('clearImages')}
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {uploadedImages.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {uploadedImages.map((img, idx) => (
                                            <div key={idx} className="relative flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                                                <img
                                                    src={img.dataUrl}
                                                    alt={img.name}
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
                                )}
                            </div>
                            <FormInput
                                id="websiteUrlForImagesAccept"
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

                    {workflow === 'llmFromImages' && (
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
                    {fullPipelineSteps !== null && (
                        <div className="space-y-3 border-t border-gray-100 pt-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-5 w-4 shrink-0 flex-col items-center justify-center">
                                    <FullPipelineRowIcon kind={fullPipelineSteps.row1.kind} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    {fullPipelineSteps.row1.titleKey !== undefined && (
                                        <>
                                            <p
                                                className={`flex flex-wrap items-center gap-x-2 text-sm font-medium leading-5 ${fullPipelineSteps.row1.kind === 'error'
                                                    ? 'text-red-700'
                                                    : 'text-gray-900'
                                                    }`}
                                            >
                                                <span>{t(fullPipelineSteps.row1.titleKey)}</span>
                                                {fullPipelineCrawlStepMs !== null && (
                                                    <span className="text-xs font-normal text-gray-500 tabular-nums">
                                                        {t('fullPipelineStepDuration', {
                                                            duration: formatDurationMs(fullPipelineCrawlStepMs),
                                                        })}
                                                    </span>
                                                )}
                                                {workflow === 'crawlAndLlm' && crawlPageStats !== null && (
                                                    <span className="inline-flex flex-wrap items-center gap-1.5">
                                                        <span className="inline-flex items-center rounded-full border border-gray-200/80 bg-gray-100 px-2 text-[11px] font-medium text-gray-800 tabular-nums">
                                                            {t('crawledPagesTotal', {
                                                                scrapedPages: crawlPageStats.total,
                                                            })}
                                                        </span>
                                                        <span className="inline-flex items-center rounded-full border border-green-200/80 bg-green-100 px-2 text-[11px] font-medium text-green-800 tabular-nums">
                                                            {t('crawledPagesHttpSuccess', {
                                                                successPages: crawlPageStats.successCount,
                                                            })}
                                                        </span>
                                                        <span className="inline-flex items-center rounded-full border border-red-200/80 bg-red-100 px-2 text-[11px] font-medium text-red-800 tabular-nums">
                                                            {t('crawledPagesHttpError', {
                                                                errorPages: crawlPageStats.errorCount,
                                                            })}
                                                        </span>
                                                        {showMarkdownEstimateBesideCrawlPageStats && (
                                                            <span className="text-xs font-normal text-gray-500 tabular-nums">
                                                                <span className="font-bold text-gray-700">
                                                                    {parseUploadTokenEstimate !== null
                                                                        ? parseUploadTokenEstimate
                                                                        : markdownTokenEstimate!}
                                                                </span>{' '}
                                                                {t('markdownStatTokensLabel')}
                                                                {' · '}
                                                                <span className="font-bold text-gray-700">
                                                                    {parseUploadTokenEstimate !== null
                                                                        ? markdownTrimmedCharCount(uploadedMarkdown!)
                                                                        : markdownTrimmedCharCount(scrapeMarkdown!)}
                                                                </span>{' '}
                                                                {t('markdownStatCharactersLabel')}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </p>
                                            {fullPipelineSteps.row1.errorDetail !== undefined &&
                                                fullPipelineSteps.row1.errorDetail !== null &&
                                                fullPipelineSteps.row1.errorDetail !== '' && (
                                                    <p className="mt-0.5 text-xs text-red-600">
                                                        {fullPipelineSteps.row1.errorDetail}
                                                    </p>
                                                )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex h-5 w-4 shrink-0 flex-col items-center justify-center">
                                    <FullPipelineRowIcon kind={fullPipelineSteps.row2.kind} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    {fullPipelineSteps.row2.titleKey !== undefined && (
                                        <>
                                            <p
                                                className={`flex flex-wrap items-center gap-x-2 text-sm font-medium leading-5 ${fullPipelineSteps.row2.kind === 'error'
                                                    ? 'text-red-700'
                                                    : 'text-gray-900'
                                                    }`}
                                            >
                                                <span>{t(fullPipelineSteps.row2.titleKey)}</span>
                                                {fullPipelineLlmStepMs !== null && (
                                                    <span className="text-xs font-normal text-gray-500 tabular-nums">
                                                        {t('fullPipelineStepDuration', {
                                                            duration: formatDurationMs(fullPipelineLlmStepMs),
                                                        })}
                                                    </span>
                                                )}
                                            </p>
                                            {fullPipelineSteps.row2.errorDetail !== undefined &&
                                                fullPipelineSteps.row2.errorDetail !== null &&
                                                fullPipelineSteps.row2.errorDetail !== '' && (
                                                    <p className="mt-0.5 text-xs text-red-600">
                                                        {fullPipelineSteps.row2.errorDetail}
                                                    </p>
                                                )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {workflow === 'crawlMdOnly' && crawlPageStats !== null && (
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
                    {showMarkdownEstimateLine && !showMarkdownEstimateBesideCrawlPageStats && (
                        <p className="text-xs text-gray-500 tabular-nums">
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

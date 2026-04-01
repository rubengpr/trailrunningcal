'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/form-select';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { DUMMY_SCRAPED_RACES, ScrapedRacesPreview } from '@/components/race/scraped-races-preview';
import { scrapeRaces, acceptScrapedRace } from '@/lib/api/races';
import { OPENROUTER_SCRAPE_MODEL_IDS } from '@/lib/openrouter/scrape-models';
import type { OpenRouterScrapeModelId } from '@/lib/openrouter/scrape-models';
import { normalizeUrl } from '@/lib/validation';
import type { TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';

type ScrapeSourceMode = 'url' | 'markdown';

export function ScrapePageContent() {
    const t = useTranslations('admin.races.scrape');

    const markdownFileInputRef = useRef<HTMLInputElement>(null);

    const [sourceMode, setSourceMode] = useState<ScrapeSourceMode>('url');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [uploadedMarkdown, setUploadedMarkdown] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    const [selectedModelId, setSelectedModelId] = useState<OpenRouterScrapeModelId>(
        OPENROUTER_SCRAPE_MODEL_IDS[0],
    );
    const [isScraping, setIsScraping] = useState(false);
    const [scrapedRaces, setScrapedRaces] = useState<TrailRaceAgentRaceRow[]>([]);
    const [scrapeError, setScrapeError] = useState<string | null>(null);
    const [hasScraped, setHasScraped] = useState(false);

    const [scrapeMarkdown, setScrapeMarkdown] = useState<string | null>(null);
    const [rawModelOutput, setRawModelOutput] = useState<string | null>(null);

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
        (sourceMode === 'url'
            ? isValidUrl(websiteUrl)
            : Boolean(uploadedMarkdown && uploadedMarkdown.length > 0));

    const handleSourceModeChange = (mode: ScrapeSourceMode): void => {
        setSourceMode(mode);
        if (mode === 'url') {
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
        } catch {
            toast.error(t('scrapeError'));
            event.target.value = '';
        }
    };

    const handleClearMarkdownFile = (): void => {
        setUploadedMarkdown(null);
        setUploadedFileName(null);
        if (markdownFileInputRef.current) {
            markdownFileInputRef.current.value = '';
        }
    };

    const handleScrape = async () => {
        setIsScraping(true);
        setScrapeError(null);
        setScrapedRaces([]);
        setHasScraped(false);
        setScrapeMarkdown(null);
        setRawModelOutput(null);
        setAcceptedIndexes(new Set());
        setAcceptingIndex(null);
        setRejectedIndexes(new Set());

        try {
            if (sourceMode === 'url') {
                const normalizedUrl = normalizeUrl(websiteUrl.trim());
                const data = await scrapeRaces({
                    websiteUrl: normalizedUrl,
                    model: selectedModelId,
                });
                setScrapedRaces(data.races);
                setScrapeMarkdown(data.markdown);
                setRawModelOutput(data.rawModelOutput);
            } else {
                const markdownBody = uploadedMarkdown;
                if (!markdownBody) {
                    return;
                }
                const data = await scrapeRaces({
                    markdown: markdownBody,
                    model: selectedModelId,
                });
                setScrapedRaces(data.races);
                setScrapeMarkdown(data.markdown);
                setRawModelOutput(data.rawModelOutput);
            }
            setHasScraped(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('scrapeError');
            setScrapeError(errorMessage);
            setHasScraped(true);
            toast.error(t('scrapeError'));
        } finally {
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

    const handleLoadDummyRaces = (): void => {
        setScrapedRaces([...DUMMY_SCRAPED_RACES]);
        setScrapeError(null);
        setHasScraped(true);
        setScrapeMarkdown(null);
        setRawModelOutput(null);
        setAcceptedIndexes(new Set());
        setAcceptingIndex(null);
        setRejectedIndexes(new Set());
    };

    const handleDownloadMarkdown = () => {
        if (!scrapeMarkdown) return;
        let downloadName: string;
        if (sourceMode === 'markdown' && uploadedFileName) {
            downloadName = uploadedFileName;
        } else {
            const hostname = new URL(normalizeUrl(websiteUrl.trim())).hostname.replace(/^www\./, '');
            downloadName = `crawl-${hostname}.md`;
        }
        const blob = new Blob([scrapeMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadRawModelOutput = (): void => {
        if (rawModelOutput === null || rawModelOutput === '') return;
        const blob = new Blob([rawModelOutput], {
            type: 'application/json;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `model-raw-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />
            <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                        <span className="text-sm font-medium text-gray-900">{t('sourceModeLabel')}</span>
                        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/80 p-1">
                            <button
                                type="button"
                                onClick={() => handleSourceModeChange('url')}
                                disabled={isScraping}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${sourceMode === 'url'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {t('sourceModeUrl')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSourceModeChange('markdown')}
                                disabled={isScraping}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${sourceMode === 'markdown'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {t('sourceModeMarkdown')}
                            </button>
                        </div>
                    </div>

                    {sourceMode === 'url' ? (
                        <FormInput
                            id="websiteUrl"
                            label={t('websiteUrlLabel')}
                            type="url"
                            value={websiteUrl}
                            placeholder={t('websiteUrlPlaceholder')}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            disabled={isScraping}
                        />
                    ) : (
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
                                <p className="text-xs text-gray-500">{t('fileUploadHint')}</p>
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

                    <FormSelect
                        id="openrouterModel"
                        label={t('modelLabel')}
                        helperText={t('modelHelper')}
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
                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                        <Button
                            type="button"
                            onClick={handleScrape}
                            disabled={!canRunScrape}
                            isLoading={isScraping}
                            loadingText={t('scraping')}
                        >
                            {t('scrapeButton')}
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
                        {isDev && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleLoadDummyRaces}
                                disabled={isScraping}
                            >
                                {t('loadDummyRaces')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {(isScraping || hasScraped) && (
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

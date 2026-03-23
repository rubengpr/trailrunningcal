'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { DUMMY_SCRAPED_RACES, ScrapedRacesPreview } from '@/components/race/scraped-races-preview';
import { scrapeRaces, acceptScrapedRace } from '@/lib/api/races';
import { normalizeUrl } from '@/lib/validation';
import type { TrailRaceAgentRaceRow } from '@/types/trail-race-agent.types';

export function ScrapePageContent() {
    const t = useTranslations('admin.races.scrape');

    const [websiteUrl, setWebsiteUrl] = useState('');
    const [isScraping, setIsScraping] = useState(false);
    const [scrapedRaces, setScrapedRaces] = useState<TrailRaceAgentRaceRow[]>([]);
    const [scrapeError, setScrapeError] = useState<string | null>(null);
    const [hasScraped, setHasScraped] = useState(false);

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

    const handleScrape = async () => {
        setIsScraping(true);
        setScrapeError(null);
        setScrapedRaces([]);
        setHasScraped(false);
        setAcceptedIndexes(new Set());
        setAcceptingIndex(null);
        setRejectedIndexes(new Set());

        try {
            const normalizedUrl = normalizeUrl(websiteUrl.trim());
            const races = await scrapeRaces(normalizedUrl);
            setScrapedRaces(races);
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
        setAcceptedIndexes(new Set());
        setAcceptingIndex(null);
        setRejectedIndexes(new Set());
    };

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="flex flex-col gap-8">
            <SectionHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />
            <div className="flex flex-col sm:flex-row items-start gap-3 max-w-2xl">
                <div className="flex-1 w-full">
                    <FormInput
                        id="websiteUrl"
                        label={t('websiteUrlLabel')}
                        type="url"
                        value={websiteUrl}
                        placeholder={t('websiteUrlPlaceholder')}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        disabled={isScraping}
                    />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-0 sm:pt-6">
                    <Button
                        type="button"
                        onClick={handleScrape}
                        disabled={!isValidUrl(websiteUrl) || isScraping}
                        isLoading={isScraping}
                        loadingText={t('scraping')}
                    >
                        {t('scrapeButton')}
                    </Button>
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

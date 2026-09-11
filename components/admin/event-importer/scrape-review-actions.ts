import type { MutableRefObject } from 'react';
import type { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { acceptScrapedEvent, saveEventImportDraft } from '@/lib/api/events';
import { addPendingEvents } from '@/lib/api/pending-events';
import { normalizeUrl } from '@/lib/validation';
import { triggerDownload } from '@/lib/utils/download';
import type { TrailEventAgentEvent, TrailEventAgentRace } from '@/types/trail-event-agent.types';
import type { ScrapeAction, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';
import {
    DUMMY_CRAWL_PAGE_STATS,
    DUMMY_LAST_RUN_DURATION_MS,
    DUMMY_EVENT_RAW_MODEL_OUTPUT,
    DUMMY_SCRAPE_MARKDOWN,
    DUMMY_SCRAPE_USAGE,
    DUMMY_SPIDER_USAGE,
    DUMMY_SCRAPED_EVENT,
    DUMMY_SCRAPED_EVENT_RACES,
} from '@/components/admin/scrape-preview.mock';
import type { FileUpload } from '@/hooks/use-file-upload';

type UploadKind = FileUpload['uploadKind'];

interface ScrapeReviewActionsParams {
    t: ReturnType<typeof useTranslations>;
    workflow: ScrapeWorkflow;
    websiteUrl: string;
    uploadKind: UploadKind;
    uploadedFileName: string | null;
    dispatch: (action: ScrapeAction) => void;
    scrapedEvent: TrailEventAgentEvent | null;
    scrapedRaces: TrailEventAgentRace[];
    scrapeEmptyMessage: string | null;
    scrapeMarkdown: string | null;
    rawModelOutput: string | null;
    jsonEditorValue: string;
    savedDraftId: string | null;
    setSavedDraftId: (id: string | null) => void;
    isSavingDraft: boolean;
    setIsSavingDraft: (value: boolean) => void;
    isAddingToPending: boolean;
    setIsAddingToPending: (value: boolean) => void;
    runStartedAtRef: MutableRefObject<number | null>;
}

export function createScrapeReviewActions(params: ScrapeReviewActionsParams) {
    const {
        t,
        workflow,
        websiteUrl,
        uploadKind,
        uploadedFileName,
        dispatch,
        scrapedEvent,
        scrapedRaces,
        scrapeEmptyMessage,
        scrapeMarkdown,
        rawModelOutput,
        jsonEditorValue,
        savedDraftId,
        setSavedDraftId,
        isSavingDraft,
        setIsSavingDraft,
        isAddingToPending,
        setIsAddingToPending,
        runStartedAtRef,
    } = params;

    const handleAddToPending = async (): Promise<void> => {
        if (isAddingToPending || !websiteUrl) return;
        setIsAddingToPending(true);
        try {
            const result = await addPendingEvents([normalizeUrl(websiteUrl)]);
            if (result.skipped.length > 0 && result.added.length === 0) {
                toast.success(t('addToPendingAlready'));
            } else {
                toast.success(t('addToPendingSuccess'));
            }
        } catch {
            toast.error(t('addToPendingError'));
        } finally {
            setIsAddingToPending(false);
        }
    };

    const handleAccept = async (): Promise<void> => {
        if (!scrapedEvent) return;
        dispatch({ type: 'ACCEPTING_INDEX', index: 0 });
        try {
            const reviewedWebsiteUrl = websiteUrl.trim();
            await acceptScrapedEvent(
                {
                    ...scrapedEvent,
                    websiteUrl: reviewedWebsiteUrl
                        ? normalizeUrl(reviewedWebsiteUrl)
                        : scrapedEvent.websiteUrl,
                },
                scrapedRaces,
            );
            dispatch({ type: 'RACE_ACCEPT', index: 0 });
            toast.success(t('results.acceptSuccess'));
        } catch (err) {
            const errorMessage = err instanceof Error
                ? err.message
                : t('results.acceptError');
            toast.error(errorMessage);
        } finally {
            dispatch({ type: 'ACCEPTING_INDEX', index: null });
        }
    };

    const handleSaveDraft = async (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): Promise<void> => {
        if (isSavingDraft || savedDraftId) return;
        setIsSavingDraft(true);
        try {
            const sourceUrl = websiteUrl.trim()
                ? normalizeUrl(websiteUrl.trim())
                : event.websiteUrl;
            const draft = await saveEventImportDraft({ event, races, sourceUrl });
            setSavedDraftId(draft.id);
            toast.success(t('results.draftSaved'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('results.draftSaveError'));
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleReject = (): void => {
        dispatch({ type: 'EVENT_REJECT' });
        toast.success(t('results.reviewRejected'));
    };

    const handleSaveReview = (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): void => {
        dispatch({ type: 'REVIEW_EDITED', event, races });
    };

    const handleSwitchToJsonView = (): void => {
        dispatch({
            type: 'JSON_TAB_OPENED',
            value: JSON.stringify({
                event: scrapedEvent,
                races: scrapedRaces,
                errorMessage: scrapeEmptyMessage,
            }, null, 2),
        });
    };

    const handleApplyJson = (): void => {
        try {
            const parsed = JSON.parse(jsonEditorValue);
            if (
                typeof parsed !== 'object' ||
                parsed === null ||
                !('event' in parsed) ||
                !Array.isArray((parsed as { races?: unknown }).races)
            ) {
                dispatch({ type: 'JSON_PARSE_FAILED', error: t('jsonNotArrayError') });
                return;
            }
            const payload = parsed as {
                event: TrailEventAgentEvent | null;
                races: TrailEventAgentRace[];
                errorMessage?: string | null;
            };
            dispatch({
                type: 'JSON_IMPORTED',
                event: payload.event,
                races: payload.races,
                errorMessage: payload.errorMessage ?? null,
            });
        } catch (err) {
            dispatch({ type: 'JSON_PARSE_FAILED', error: err instanceof Error ? err.message : t('jsonParseError') });
        }
    };

    const handleLoadDummyPreview = (): void => {
        runStartedAtRef.current = null;
        const isMarkdownOnly = workflow === 'ingest';
        dispatch({
            type: 'PREVIEW_LOADED',
            durationMs: DUMMY_LAST_RUN_DURATION_MS,
            scrapedEvent: isMarkdownOnly ? null : DUMMY_SCRAPED_EVENT,
            scrapedRaces: isMarkdownOnly ? [] : [...DUMMY_SCRAPED_EVENT_RACES],
            emptyMessage: isMarkdownOnly ? t('results.noResults') : null,
            markdown: DUMMY_SCRAPE_MARKDOWN,
            rawModelOutput: isMarkdownOnly ? null : DUMMY_EVENT_RAW_MODEL_OUTPUT,
            usage: isMarkdownOnly ? null : { ...DUMMY_SCRAPE_USAGE },
            spiderUsage: workflow === 'llmFromFile' ? null : { ...DUMMY_SPIDER_USAGE },
            pageStats: workflow === 'llmFromFile' ? null : { ...DUMMY_CRAWL_PAGE_STATS },
            showPipeline: workflow === 'full',
        });
    };

    const resetScrapeWorkflow = (): void => {
        setSavedDraftId(null);
        runStartedAtRef.current = null;
        dispatch({ type: 'WORKFLOW_RESET' });
    };

    const handleDownloadMarkdown = (): void => {
        if (!scrapeMarkdown) return;
        let downloadName: string;
        if (workflow === 'llmFromFile' && uploadKind === 'markdown' && uploadedFileName) {
            downloadName = uploadedFileName;
        } else {
            const hostname = new URL(normalizeUrl(websiteUrl.trim())).hostname.replace(/^www\./, '');
            downloadName = `crawl-${hostname}.md`;
        }
        triggerDownload(scrapeMarkdown, downloadName, 'text/markdown');
    };

    const handleDownloadRawModelOutput = (): void => {
        if (rawModelOutput === null || rawModelOutput === '') return;
        triggerDownload(rawModelOutput, `model-raw-${Date.now()}.json`, 'application/json;charset=utf-8');
    };

    return {
        handleAddToPending,
        handleAccept,
        handleSaveDraft,
        handleReject,
        handleSaveReview,
        handleSwitchToJsonView,
        handleApplyJson,
        handleLoadDummyPreview,
        resetScrapeWorkflow,
        handleDownloadMarkdown,
        handleDownloadRawModelOutput,
    };
}

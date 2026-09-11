import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
    startEventImportBatch,
    getEventImportBatchStatus,
    getEventImportItemResult,
} from '@/lib/api/events';
import { normalizeUrl } from '@/lib/validation';
import type { EventImportBatchSnapshot, EventImportResult } from '@/types/events-import-api.types';
import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import { isValidUrl } from '@/components/admin/event-importer/workflow-helpers';
import { computeBatchRows } from '@/components/admin/event-importer/bulk-process-rows';
import { useBatchReviewActions } from '@/components/admin/event-importer/use-batch-review-actions';
import type { ConflictingRace } from '@/types/race.types';

interface UseBatchImportParams {
    t: ReturnType<typeof useTranslations>;
    selectedModelId: OpenRouterScrapeModelId;
    resetScrapeResults: () => void;
    isSavingDraft: boolean;
    setIsSavingDraft: (value: boolean) => void;
    setImportConflicts: (conflicts: ConflictingRace[]) => void;
    openConflictModal: () => void;
}

export function useBatchImport({
    t,
    selectedModelId,
    resetScrapeResults,
    isSavingDraft,
    setIsSavingDraft,
    setImportConflicts,
    openConflictModal,
}: UseBatchImportParams) {
    const [batchUrlsInput, setBatchUrlsInput] = useState('');
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [batchSnapshot, setBatchSnapshot] = useState<EventImportBatchSnapshot | null>(null);
    const [isStartingBatch, setIsStartingBatch] = useState(false);
    const [viewingBatchItemId, setViewingBatchItemId] = useState<string | null>(null);
    const [reviewingBatchItemId, setReviewingBatchItemId] = useState<string | null>(null);
    const [reviewingBatchResult, setReviewingBatchResult] = useState<EventImportResult | null>(null);
    const [isAcceptingBatchItem, setIsAcceptingBatchItem] = useState(false);
    const [savedBatchDraftId, setSavedBatchDraftId] = useState<string | null>(null);
    const fetchedBatchItemIds = useRef<Set<string>>(new Set());

    const closeBatchReview = useCallback((): void => {
        setReviewingBatchItemId(null);
        setReviewingBatchResult(null);
    }, []);

    const parsedBatchUrls = useMemo((): string[] => {
        const urls = batchUrlsInput
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean)
            .map(normalizeUrl);

        return Array.from(new Set(urls));
    }, [batchUrlsInput]);

    const isBatchRunning =
        batchSnapshot?.batch.status === 'pending' || batchSnapshot?.batch.status === 'running';

    const canRunBatch =
        parsedBatchUrls.length > 0 &&
        parsedBatchUrls.every(isValidUrl) &&
        !isStartingBatch &&
        !isBatchRunning;

    const fetchBatchStatus = useCallback(async (batchId: string): Promise<EventImportBatchSnapshot> => {
        const data = await getEventImportBatchStatus(batchId);
        setBatchSnapshot(data);
        return data;
    }, []);

    const handleStartBatchImport = async (): Promise<void> => {
        setIsStartingBatch(true);
        setBatchSnapshot(null);
        setActiveBatchId(null);
        closeBatchReview();
        resetScrapeResults();

        try {
            const result = await startEventImportBatch({
                urls: parsedBatchUrls,
                model: selectedModelId,
            });

            if (!result.ok) {
                setImportConflicts(result.conflicts);
                openConflictModal();
                return;
            }

            setActiveBatchId(result.data.batchId);
            await fetchBatchStatus(result.data.batchId);
            toast.success(parsedBatchUrls.length === 1 ? t('bulk.startSuccessOne') : t('bulk.startSuccess', { count: parsedBatchUrls.length }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('bulk.runError');
            toast.error(errorMessage);
        } finally {
            setIsStartingBatch(false);
        }
    };

    useEffect(() => {
        if (!activeBatchId || !batchSnapshot) {
            return;
        }

        if (batchSnapshot.batch.status !== 'pending' && batchSnapshot.batch.status !== 'running') {
            return;
        }

        const intervalId = window.setInterval(() => {
            void fetchBatchStatus(activeBatchId).catch((error) => {
                console.error('Race import batch polling error:', error);
                toast.error(t('bulk.pollError'));
                setActiveBatchId(null);
            });
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, [activeBatchId, batchSnapshot, fetchBatchStatus, t]);

    useEffect(() => {
        if (!batchSnapshot || isBatchRunning) return;

        const completedItems = batchSnapshot.items.filter(
            (item) => item.status === 'completed' && !fetchedBatchItemIds.current.has(item.id),
        );
        if (completedItems.length === 0) return;

        const itemIds = completedItems.map((item) => item.id);
        itemIds.forEach((id) => fetchedBatchItemIds.current.add(id));
    }, [batchSnapshot, isBatchRunning]);

    const handleViewBatchResult = async (itemId: string): Promise<void> => {
        setSavedBatchDraftId(null);
        setViewingBatchItemId(itemId);

        try {
            const result = await getEventImportItemResult(itemId);
            setReviewingBatchResult(result);
            setReviewingBatchItemId(itemId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t('bulk.resultError');
            toast.error(errorMessage);
        } finally {
            setViewingBatchItemId(null);
        }
    };

    const reviewingBatchItem = reviewingBatchItemId
        ? batchSnapshot?.items.find((item) => item.id === reviewingBatchItemId) ?? null
        : null;

    const { handleAcceptBatchItem, handleSaveBatchReview, handleSaveBatchDraft } = useBatchReviewActions({
        t,
        reviewingBatchItemId,
        isAcceptingBatchItem,
        setIsAcceptingBatchItem,
        setBatchSnapshot,
        closeBatchReview,
        setReviewingBatchResult,
        reviewingBatchItem,
        isSavingDraft,
        setIsSavingDraft,
        savedBatchDraftId,
        setSavedBatchDraftId,
    });

    const batchRows = useMemo(
        (): BulkProcessTableRow[] => computeBatchRows(batchSnapshot),
        [batchSnapshot],
    );

    const resetBatch = (): void => {
        setBatchUrlsInput('');
        setActiveBatchId(null);
        setBatchSnapshot(null);
        setViewingBatchItemId(null);
        setSavedBatchDraftId(null);
        closeBatchReview();
        fetchedBatchItemIds.current.clear();
    };

    return {
        batchUrlsInput,
        setBatchUrlsInput,
        activeBatchId,
        batchSnapshot,
        isStartingBatch,
        viewingBatchItemId,
        reviewingBatchItemId,
        reviewingBatchResult,
        isAcceptingBatchItem,
        savedBatchDraftId,
        parsedBatchUrls,
        isBatchRunning,
        canRunBatch,
        handleStartBatchImport,
        handleViewBatchResult,
        handleAcceptBatchItem,
        handleSaveBatchReview,
        handleSaveBatchDraft,
        closeBatchReview,
        batchRows,
        reviewingBatchItem,
        resetBatch,
    };
}

import type { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
    acceptEventImportItem,
    saveEventImportDraft,
    updateEventImportItemResult,
} from '@/lib/api/events';
import type { EventImportBatchSnapshot, EventImportResult } from '@/types/events-import-api.types';
import type {
    TrailEventAgentEvent,
    TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface BatchItem {
    id: string;
    url: string;
    savedDraftId: string | null;
}

interface UseBatchReviewActionsParams {
    t: ReturnType<typeof useTranslations>;
    reviewingBatchItemId: string | null;
    isAcceptingBatchItem: boolean;
    setIsAcceptingBatchItem: (value: boolean) => void;
    setBatchSnapshot: (
        updater: (current: EventImportBatchSnapshot | null) => EventImportBatchSnapshot | null,
    ) => void;
    closeBatchReview: () => void;
    setReviewingBatchResult: (result: EventImportResult) => void;
    reviewingBatchItem: BatchItem | null;
    isSavingDraft: boolean;
    setIsSavingDraft: (value: boolean) => void;
    savedBatchDraftId: string | null;
    setSavedBatchDraftId: (value: string | null) => void;
}

export function useBatchReviewActions({
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
}: UseBatchReviewActionsParams) {
    const handleAcceptBatchItem = async (): Promise<void> => {
        if (!reviewingBatchItemId || isAcceptingBatchItem) return;

        setIsAcceptingBatchItem(true);

        try {
            const { eventId, eventSlug } = await acceptEventImportItem(reviewingBatchItemId);
            const updatedAt = new Date().toISOString();

            setBatchSnapshot((current) => {
                if (!current) return current;

                return {
                    ...current,
                    items: current.items.map((item) =>
                        item.id === reviewingBatchItemId
                            ? {
                                ...item,
                                reviewStatus: 'accepted',
                                acceptedEventId: eventId,
                                acceptedEventSlug: eventSlug,
                                reviewedAt: updatedAt,
                                updatedAt,
                            }
                            : item,
                    ),
                };
            });
            closeBatchReview();
            toast.success(t('results.acceptSuccess'));
        } catch {
            toast.error(t('bulk.acceptError'));
        } finally {
            setIsAcceptingBatchItem(false);
        }
    };

    const handleSaveBatchReview = async (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): Promise<void> => {
        if (!reviewingBatchItemId) return;

        try {
            const result = await updateEventImportItemResult(
                reviewingBatchItemId,
                { event, races },
            );
            setReviewingBatchResult(result);
            setBatchSnapshot((current) => {
                if (!current) return current;

                const updatedAt = new Date().toISOString();
                return {
                    ...current,
                    items: current.items.map((item) =>
                        item.id === reviewingBatchItemId
                            ? {
                                ...item,
                                raceCount: result.races.length,
                                updatedAt,
                            }
                            : item,
                    ),
                };
            });
            toast.success(t('bulk.reviewSaveSuccess'));
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : t('bulk.reviewSaveError'),
            );
            throw error;
        }
    };

    const handleSaveBatchDraft = async (
        event: TrailEventAgentEvent,
        races: TrailEventAgentRace[],
    ): Promise<void> => {
        if (!reviewingBatchItem || isSavingDraft || savedBatchDraftId) return;
        setIsSavingDraft(true);
        try {
            const draft = await saveEventImportDraft({
                event,
                races,
                sourceUrl: reviewingBatchItem.url,
                batchItemId: reviewingBatchItem.id,
            });
            setSavedBatchDraftId(draft.id);
            setBatchSnapshot((current) => current ? {
                ...current,
                items: current.items.map((item) => item.id === reviewingBatchItem.id
                    ? { ...item, savedDraftId: draft.id }
                    : item),
            } : current);
            toast.success(t('results.draftSaved'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('results.draftSaveError'));
        } finally {
            setIsSavingDraft(false);
        }
    };

    return { handleAcceptBatchItem, handleSaveBatchReview, handleSaveBatchDraft };
}

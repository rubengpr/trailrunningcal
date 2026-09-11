import type { useTranslations } from 'next-intl';
import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';
import { RESEARCH_ERROR_TRANSLATION_KEYS } from '@/components/admin/event-importer/workflow-helpers';
import type { EventImportBatchSnapshot } from '@/types/events-import-api.types';
import type { EventResearchBatchSnapshot } from '@/types/event-research.types';

export function computeBatchRows(
    batchSnapshot: EventImportBatchSnapshot | null,
): BulkProcessTableRow[] {
    return batchSnapshot?.items.map((item) => ({
        id: item.id,
        url: item.url,
        status: item.status,
        reviewStatus: item.reviewStatus,
        acceptedEventId: item.acceptedEventId,
        acceptedEventSlug: item.acceptedEventSlug,
        raceCount: item.raceCount,
        error: item.error,
        updatedAt: item.updatedAt,
        markdown: item.markdown,
        rawModelOutput: item.rawModelOutput,
    })) ?? [];
}

export function computeResearchRows(
    researchSnapshot: EventResearchBatchSnapshot | null,
    t: ReturnType<typeof useTranslations>,
): BulkProcessTableRow[] {
    return researchSnapshot?.items.map((item) => ({
        id: item.id,
        label: item.eventName,
        url: null,
        status: item.status,
        reviewStatus: 'pending',
        acceptedEventId: null,
        acceptedEventSlug: null,
        raceCount: item.raceCount,
        error: item.error
            ? t(RESEARCH_ERROR_TRANSLATION_KEYS[item.error] ?? 'research.errors.unknown')
            : null,
        negativeMessage:
            item.status === 'completed' && item.draftId === null
                ? item.result?.errorMessage ?? null
                : null,
        updatedAt: item.updatedAt,
        markdown: null,
        rawModelOutput: null,
        draftId: item.draftId,
    })) ?? [];
}

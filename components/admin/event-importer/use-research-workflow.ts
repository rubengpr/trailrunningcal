import { useCallback, useEffect, useMemo, useState } from 'react';
import type { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import {
    startEventResearchBatch,
    getEventResearchBatchHistory,
    getEventResearchBatchStatus,
    retryEventResearchItem,
} from '@/lib/api/events';
import type {
    EventResearchBatchHistoryEntry,
    EventResearchBatchSnapshot,
} from '@/types/event-research.types';
import type { BulkProcessTableRow } from '@/components/admin/bulk-process-table';
import type { ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';
import { computeResearchRows } from '@/components/admin/event-importer/bulk-process-rows';

interface UseResearchWorkflowParams {
    t: ReturnType<typeof useTranslations>;
    workflow: ScrapeWorkflow;
}

export function useResearchWorkflow({ t, workflow }: UseResearchWorkflowParams) {
    const [researchNamesInput, setResearchNamesInput] = useState('');
    const [researchHistory, setResearchHistory] = useState<EventResearchBatchHistoryEntry[]>([]);
    const [isLoadingResearchHistory, setIsLoadingResearchHistory] = useState(false);
    const [researchHistoryError, setResearchHistoryError] = useState(false);
    const [activeResearchBatchId, setActiveResearchBatchId] = useState<string | null>(null);
    const [researchSnapshot, setResearchSnapshot] = useState<EventResearchBatchSnapshot | null>(null);
    const [isStartingResearch, setIsStartingResearch] = useState(false);
    const [retryingResearchItemId, setRetryingResearchItemId] = useState<string | null>(null);

    const parsedResearchNames = useMemo((): string[] => {
        const unique = new Map<string, string>();
        for (const rawName of researchNamesInput.split(/\r?\n/)) {
            const name = rawName.trim();
            if (!name) continue;
            const key = name.normalize('NFKC').toLocaleLowerCase('es');
            if (!unique.has(key)) unique.set(key, name);
        }
        return [...unique.values()];
    }, [researchNamesInput]);

    const isResearchRunning =
        researchSnapshot?.batch.status === 'pending' ||
        researchSnapshot?.batch.status === 'running';

    const canRunResearch =
        parsedResearchNames.length > 0 &&
        parsedResearchNames.length <= 50 &&
        parsedResearchNames.every((name) => name.length >= 2 && name.length <= 200) &&
        !isStartingResearch &&
        !isResearchRunning;

    const fetchResearchStatus = useCallback(async (batchId: string): Promise<EventResearchBatchSnapshot> => {
        const data = await getEventResearchBatchStatus(batchId);
        setResearchSnapshot(data);
        return data;
    }, []);

    const fetchResearchHistory = useCallback(async (): Promise<void> => {
        setIsLoadingResearchHistory(true);
        setResearchHistoryError(false);
        try {
            setResearchHistory(await getEventResearchBatchHistory());
        } catch {
            setResearchHistoryError(true);
        } finally {
            setIsLoadingResearchHistory(false);
        }
    }, []);

    const handleSelectResearchBatch = async (batchId: string): Promise<void> => {
        setActiveResearchBatchId(batchId);
        setResearchSnapshot(null);
        try {
            await fetchResearchStatus(batchId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('research.pollError'));
        }
    };

    const handleStartResearch = async (): Promise<void> => {
        setIsStartingResearch(true);
        setResearchSnapshot(null);
        setActiveResearchBatchId(null);
        try {
            const data = await startEventResearchBatch(parsedResearchNames);
            setActiveResearchBatchId(data.batchId);
            await fetchResearchStatus(data.batchId);
            await fetchResearchHistory();
            toast.success(parsedResearchNames.length === 1
                ? t('research.startSuccessOne')
                : t('research.startSuccess', { count: parsedResearchNames.length }));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('research.runError'));
        } finally {
            setIsStartingResearch(false);
        }
    };

    const handleRetryResearchItem = async (itemId: string): Promise<void> => {
        if (retryingResearchItemId) return;
        setRetryingResearchItemId(itemId);
        try {
            const data = await retryEventResearchItem(itemId);
            setActiveResearchBatchId(data.batchId);
            await fetchResearchStatus(data.batchId);
            await fetchResearchHistory();
            toast.success(t('research.retrySuccess'));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('research.retryError'));
        } finally {
            setRetryingResearchItemId(null);
        }
    };

    useEffect(() => {
        if (!activeResearchBatchId || !isResearchRunning) return;
        const intervalId = window.setInterval(() => {
            void fetchResearchStatus(activeResearchBatchId).catch((error) => {
                console.error('Event research batch polling error:', error);
                toast.error(t('research.pollError'));
                setActiveResearchBatchId(null);
            });
        }, 3000);
        return () => window.clearInterval(intervalId);
    }, [activeResearchBatchId, fetchResearchStatus, isResearchRunning, t]);

    useEffect(() => {
        if (workflow !== 'research') return;
        void fetchResearchHistory();
    }, [fetchResearchHistory, workflow]);

    const researchRows = useMemo(
        (): BulkProcessTableRow[] => computeResearchRows(researchSnapshot, t),
        [researchSnapshot, t],
    );

    const resetResearch = (): void => {
        setResearchNamesInput('');
        setActiveResearchBatchId(null);
        setResearchSnapshot(null);
    };

    return {
        researchNamesInput,
        setResearchNamesInput,
        researchHistory,
        isLoadingResearchHistory,
        researchHistoryError,
        activeResearchBatchId,
        researchSnapshot,
        isStartingResearch,
        retryingResearchItemId,
        parsedResearchNames,
        isResearchRunning,
        canRunResearch,
        fetchResearchHistory,
        handleSelectResearchBatch,
        handleStartResearch,
        handleRetryResearchItem,
        researchRows,
        resetResearch,
    };
}

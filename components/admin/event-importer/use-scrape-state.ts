import { useReducer, useState } from 'react';
import { useLiveTimer } from '@/hooks/use-live-timer';
import { initialScrapeState, scrapeReducer } from '@/components/admin/event-importer/scrape-reducer';

export function useScrapeState() {
    const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isAddingToPending, setIsAddingToPending] = useState(false);

    const [state, dispatch] = useReducer(scrapeReducer, initialScrapeState);

    const { elapsedMs: liveElapsedMs, startedAtRef: runStartedAtRef } = useLiveTimer(state.isScraping);

    const resetScrapeResults = (): void => {
        setSavedDraftId(null);
        dispatch({ type: 'RESULTS_CLEARED' });
    };

    return {
        state,
        dispatch,
        savedDraftId,
        setSavedDraftId,
        isSavingDraft,
        setIsSavingDraft,
        isAddingToPending,
        setIsAddingToPending,
        liveElapsedMs,
        runStartedAtRef,
        resetScrapeResults,
    };
}

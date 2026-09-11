import type { useTranslations } from 'next-intl';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { ConflictingRace } from '@/types/race.types';
import type { FileUpload } from '@/hooks/use-file-upload';
import type { ScrapeSourceMode, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';
import type { useScrapeState } from '@/components/admin/event-importer/use-scrape-state';
import { createRunScrapeWorkflow } from '@/components/admin/event-importer/scrape-run-workflow';
import { createScrapeReviewActions } from '@/components/admin/event-importer/scrape-review-actions';

type UploadKind = FileUpload['uploadKind'];
type UploadedImage = FileUpload['uploadedImages'][number];

interface UseScrapeWorkflowParams {
    t: ReturnType<typeof useTranslations>;
    workflow: ScrapeWorkflow;
    sourceMode: ScrapeSourceMode;
    websiteUrl: string;
    selectedModelId: OpenRouterScrapeModelId;
    selectedVisionModelId: OpenRouterVisionModelId;
    uploadKind: UploadKind;
    uploadedMarkdown: string | null;
    uploadedImages: UploadedImage[];
    uploadedFileName: string | null;
    setImportConflicts: (conflicts: ConflictingRace[]) => void;
    openConflictModal: () => void;
    scrapeState: ReturnType<typeof useScrapeState>;
}

export function useScrapeWorkflow({
    t,
    workflow,
    sourceMode,
    websiteUrl,
    selectedModelId,
    selectedVisionModelId,
    uploadKind,
    uploadedMarkdown,
    uploadedImages,
    uploadedFileName,
    setImportConflicts,
    openConflictModal,
    scrapeState,
}: UseScrapeWorkflowParams) {
    const { state, dispatch } = scrapeState;

    const runScrapeWorkflow = createRunScrapeWorkflow({
        t,
        workflow,
        sourceMode,
        websiteUrl,
        selectedModelId,
        selectedVisionModelId,
        uploadKind,
        uploadedMarkdown,
        uploadedImages,
        setImportConflicts,
        openConflictModal,
        dispatch,
        setSavedDraftId: scrapeState.setSavedDraftId,
        runStartedAtRef: scrapeState.runStartedAtRef,
    });

    const reviewActions = createScrapeReviewActions({
        t,
        workflow,
        websiteUrl,
        uploadKind,
        uploadedFileName,
        dispatch,
        scrapedEvent: state.scrapedEvent,
        scrapedRaces: state.scrapedRaces,
        scrapeEmptyMessage: state.scrapeEmptyMessage,
        scrapeMarkdown: state.scrapeMarkdown,
        rawModelOutput: state.rawModelOutput,
        jsonEditorValue: state.jsonEditorValue,
        savedDraftId: scrapeState.savedDraftId,
        setSavedDraftId: scrapeState.setSavedDraftId,
        isSavingDraft: scrapeState.isSavingDraft,
        setIsSavingDraft: scrapeState.setIsSavingDraft,
        isAddingToPending: scrapeState.isAddingToPending,
        setIsAddingToPending: scrapeState.setIsAddingToPending,
        runStartedAtRef: scrapeState.runStartedAtRef,
    });

    return {
        dispatch,
        ...state,
        liveElapsedMs: scrapeState.liveElapsedMs,
        runStartedAtRef: scrapeState.runStartedAtRef,
        savedDraftId: scrapeState.savedDraftId,
        isSavingDraft: scrapeState.isSavingDraft,
        isAddingToPending: scrapeState.isAddingToPending,
        resetScrapeResults: scrapeState.resetScrapeResults,
        runScrapeWorkflow,
        ...reviewActions,
    };
}

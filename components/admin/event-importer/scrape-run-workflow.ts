import type { MutableRefObject } from 'react';
import type { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { runTrailEventAgent, runEventImport } from '@/lib/api/events';
import { normalizeUrl } from '@/lib/validation';
import type { EventImportWorkflow } from '@/types/events-import-api.types';
import type { OpenRouterScrapeModelId, OpenRouterVisionModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { ConflictingRace } from '@/types/race.types';
import type { FileUpload } from '@/hooks/use-file-upload';
import type { ScrapeAction, ScrapeSourceMode, ScrapeWorkflow } from '@/components/admin/event-importer/scrape-reducer';
import { findStep } from '@/components/admin/event-importer/workflow-helpers';

type UploadKind = FileUpload['uploadKind'];
type UploadedImage = FileUpload['uploadedImages'][number];

interface RunScrapeWorkflowParams {
    t: ReturnType<typeof useTranslations>;
    workflow: ScrapeWorkflow;
    sourceMode: ScrapeSourceMode;
    websiteUrl: string;
    selectedModelId: OpenRouterScrapeModelId;
    selectedVisionModelId: OpenRouterVisionModelId;
    uploadKind: UploadKind;
    uploadedMarkdown: string | null;
    uploadedImages: UploadedImage[];
    setImportConflicts: (conflicts: ConflictingRace[]) => void;
    openConflictModal: () => void;
    dispatch: (action: ScrapeAction) => void;
    setSavedDraftId: (id: string | null) => void;
    runStartedAtRef: MutableRefObject<number | null>;
}

function resolveImportWorkflow(
    workflow: ScrapeWorkflow,
    sourceMode: ScrapeSourceMode,
): EventImportWorkflow | null {
    if (workflow === 'full') {
        return sourceMode === 'crawlSite' ? 'crawlSiteExtract' : 'scrapePageExtract';
    }
    if (workflow === 'ingest') return sourceMode;
    return null;
}

export function createRunScrapeWorkflow(params: RunScrapeWorkflowParams) {
    const {
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
        setSavedDraftId,
        runStartedAtRef,
    } = params;

    return async function runScrapeWorkflow(): Promise<void> {
        setSavedDraftId(null);
        runStartedAtRef.current = performance.now();

        try {
            const importWorkflow = resolveImportWorkflow(workflow, sourceMode);
            if (importWorkflow !== null) {
                const normalizedUrl = normalizeUrl(websiteUrl.trim());

                if (workflow === 'full') {
                    dispatch({ type: 'CRAWL_SITE_EXTRACT_START', startedAt: performance.now() });
                } else {
                    dispatch({ type: 'SCRAPE_START' });
                }

                const result = await runEventImport(
                    importWorkflow === 'crawlSite' || importWorkflow === 'scrapePage'
                        ? { workflow: importWorkflow, websiteUrl: normalizedUrl }
                        : { workflow: importWorkflow, websiteUrl: normalizedUrl, model: selectedModelId },
                );

                if (!result.ok) {
                    if ('reason' in result) {
                        const errorMessage = result.reason === 'markdown_too_long'
                            ? t('markdownTooLong')
                            : t('markdownTooShort');
                        dispatch({ type: 'SCRAPE_ERROR', error: errorMessage, markdown: result.markdown });
                        toast.error(errorMessage);
                        return;
                    }
                    setImportConflicts(result.conflicts);
                    openConflictModal();
                    dispatch({ type: 'WORKFLOW_RESET' });
                    return;
                }

                const crawlStep = findStep(result.data.steps, 'crawlSite') ?? findStep(result.data.steps, 'scrapePage');
                const extractStep = findStep(result.data.steps, 'extract');
                dispatch({
                    type: 'IMPORT_SUCCESS',
                    result: result.data,
                    persistedRows: [],
                    showPipeline: workflow === 'full',
                    crawlStepStartedAt: crawlStep ? 0 : null,
                    crawlStepEndedAt: crawlStep ? crawlStep.durationMs : null,
                    llmStepStartedAt: extractStep ? 0 : null,
                    llmStepEndedAt: extractStep ? extractStep.durationMs : null,
                });
                return;
            }

            if (workflow === 'llmFromFile') {
                if (uploadKind === 'images') {
                    if (uploadedImages.length === 0) return;
                    const result = await runTrailEventAgent({
                        mode: 'images',
                        images: uploadedImages.map(img => img.dataUrl),
                        model: selectedVisionModelId,
                    });
                    if (!result.ok) throw new Error(t('scrapeError'));
                    dispatch({ type: 'AGENT_SUCCESS', event: result.data.event, races: result.data.races, errorMessage: result.data.errorMessage, rawModelOutput: result.data.rawModelOutput, usage: result.data.usage });
                } else {
                    const markdownBody = uploadedMarkdown;
                    if (!markdownBody) return;
                    const result = await runTrailEventAgent({
                        mode: 'markdown',
                        markdown: markdownBody,
                        model: selectedModelId,
                    });
                    if (!result.ok) {
                        const errorMessage = result.reason === 'markdown_too_long'
                            ? t('markdownTooLong')
                            : t('markdownTooShort');
                        dispatch({ type: 'SCRAPE_ERROR', error: errorMessage, markdown: result.markdown });
                        toast.error(errorMessage);
                        return;
                    }
                    dispatch({ type: 'AGENT_SUCCESS', event: result.data.event, races: result.data.races, errorMessage: result.data.errorMessage, rawModelOutput: result.data.rawModelOutput, usage: result.data.usage, markdown: result.data.markdown });
                }
            }
        } catch (err) {
            const isTimeout = err instanceof Error && err.message === 'timeout';
            const errorMessage = isTimeout ? t('scrapeTimeout') : t('scrapeError');
            dispatch({ type: 'SCRAPE_ERROR', error: errorMessage });
            toast.error(errorMessage);
        } finally {
            const startedAt = runStartedAtRef.current;
            const durationMs =
                startedAt !== null ? Math.round(performance.now() - startedAt) : 0;
            dispatch({ type: 'SCRAPE_COMPLETE', durationMs });
            runStartedAtRef.current = null;
        }
    };
}

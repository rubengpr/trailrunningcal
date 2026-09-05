'use client';

import { useTranslations } from 'next-intl';
import { Combobox } from '@/components/ui/combobox';
import type { ComboboxOption } from '@/components/ui/combobox';
import { FormSelect } from '@/components/ui/form-select';
import {
  OPENROUTER_SCRAPE_MODEL_IDS,
  OPENROUTER_VISION_MODEL_IDS,
} from '@/lib/integrations/openrouter/scrape-models';
import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';

type Workflow = 'bulk' | 'full' | 'ingest' | 'llmFromFile' | 'research';
type SourceMode = 'scrapePage' | 'crawlSite';
type UploadKind = 'markdown' | 'images' | null;

interface ImportWorkflowFieldsProps {
  workflow: Workflow;
  websiteUrl: string;
  pendingUrlOptions: ComboboxOption[];
  sourceMode: SourceMode;
  selectedModelId: OpenRouterScrapeModelId;
  selectedVisionModelId: OpenRouterVisionModelId;
  uploadKind: UploadKind;
  isScraping: boolean;
  isStartingBatch: boolean;
  isBatchRunning: boolean;
  onWebsiteUrlChange: (value: string) => void;
  onSourceModeChange: (value: SourceMode) => void;
  onModelChange: (value: OpenRouterScrapeModelId) => void;
  onVisionModelChange: (value: OpenRouterVisionModelId) => void;
}

export function ImportWorkflowFields({
  workflow,
  websiteUrl,
  pendingUrlOptions,
  sourceMode,
  selectedModelId,
  selectedVisionModelId,
  uploadKind,
  isScraping,
  isStartingBatch,
  isBatchRunning,
  onWebsiteUrlChange,
  onSourceModeChange,
  onModelChange,
  onVisionModelChange,
}: ImportWorkflowFieldsProps): React.ReactElement {
  const t = useTranslations('admin.races.import');
  const showsUrlField = workflow === 'full' || workflow === 'ingest' || workflow === 'llmFromFile';
  const showsSourceMode = workflow === 'full' || workflow === 'ingest';
  const showsScrapeModel = workflow === 'full' || workflow === 'bulk' || (workflow === 'llmFromFile' && uploadKind !== 'images');
  const showsVisionModel = workflow === 'llmFromFile' && uploadKind === 'images';
  const isFullWorkflow = workflow === 'full';

  return (
    <>
      {showsUrlField ? (
        <Combobox
          id={workflow === 'llmFromFile' ? 'websiteUrlForAccept' : 'websiteUrl'}
          label={workflow === 'llmFromFile' ? t('eventUrlForAcceptLabel') : t('websiteUrlLabel')}
          value={websiteUrl}
          onChange={onWebsiteUrlChange}
          options={pendingUrlOptions}
          placeholder={t('websiteUrlPlaceholder')}
          helperText={workflow === 'llmFromFile' ? t('urlForAcceptHint') : undefined}
          disabled={isScraping}
          className="max-w-xl"
        />
      ) : null}

      {showsSourceMode ? (
        <div className={isFullWorkflow ? 'grid max-w-xl grid-cols-2 gap-4' : undefined}>
          <FormSelect
            id="importSourceMode"
            label={t('importSourceModeLabel')}
            value={sourceMode}
            onChange={(event) => onSourceModeChange(event.target.value as SourceMode)}
            disabled={isScraping}
            containerClassName={isFullWorkflow ? undefined : 'max-w-xl'}
          >
            <option value="scrapePage">{t('sourceScrapePage')}</option>
            <option value="crawlSite">{t('sourceCrawlSite')}</option>
          </FormSelect>
          {isFullWorkflow ? (
            <ModelSelect
              value={selectedModelId}
              disabled={isScraping || isStartingBatch || isBatchRunning}
              onChange={onModelChange}
            />
          ) : null}
        </div>
      ) : null}

      {showsScrapeModel && !isFullWorkflow ? (
        <ModelSelect
          value={selectedModelId}
          disabled={isScraping || isStartingBatch || isBatchRunning}
          onChange={onModelChange}
          containerClassName="max-w-xl"
        />
      ) : null}

      {showsVisionModel ? (
        <VisionModelSelect
          value={selectedVisionModelId}
          disabled={isScraping}
          onChange={onVisionModelChange}
        />
      ) : null}
    </>
  );
}

interface ModelSelectProps {
  value: OpenRouterScrapeModelId;
  disabled: boolean;
  onChange: (value: OpenRouterScrapeModelId) => void;
  containerClassName?: string;
}

function ModelSelect({ value, disabled, onChange, containerClassName }: ModelSelectProps): React.ReactElement {
  const t = useTranslations('admin.races.import');

  return (
    <FormSelect
      id="openrouterModel"
      label={t('modelLabel')}
      value={value}
      onChange={(event) => onChange(event.target.value as OpenRouterScrapeModelId)}
      disabled={disabled}
      containerClassName={containerClassName}
    >
      {OPENROUTER_SCRAPE_MODEL_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
    </FormSelect>
  );
}

interface VisionModelSelectProps {
  value: OpenRouterVisionModelId;
  disabled: boolean;
  onChange: (value: OpenRouterVisionModelId) => void;
}

function VisionModelSelect({ value, disabled, onChange }: VisionModelSelectProps): React.ReactElement {
  const t = useTranslations('admin.races.import');

  return (
    <FormSelect
      id="openrouterVisionModel"
      label={t('modelLabel')}
      value={value}
      onChange={(event) => onChange(event.target.value as OpenRouterVisionModelId)}
      disabled={disabled}
      containerClassName="max-w-xl"
    >
      {OPENROUTER_VISION_MODEL_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
    </FormSelect>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { ErrorMessage } from '@/components/ui/error-message';
import type { EventResearchBatchHistoryEntry } from '@/types/event-research.types';

interface ResearchWorkflowPanelProps {
  namesInput: string;
  parsedNamesCount: number;
  isStarting: boolean;
  isRunning: boolean;
  history: EventResearchBatchHistoryEntry[];
  activeBatchId: string | null;
  isLoadingHistory: boolean;
  hasHistoryError: boolean;
  onNamesInputChange: (value: string) => void;
  onSelectBatch: (batchId: string) => void;
  onRetryHistory: () => void;
}

export function ResearchWorkflowPanel({
  namesInput,
  parsedNamesCount,
  isStarting,
  isRunning,
  history,
  activeBatchId,
  isLoadingHistory,
  hasHistoryError,
  onNamesInputChange,
  onSelectBatch,
  onRetryHistory,
}: ResearchWorkflowPanelProps): React.ReactElement {
  const t = useTranslations('admin.events.import');

  return (
    <div className="grid w-full gap-5">
      <div className="grid gap-2">
        <label htmlFor="researchEventNames" className="text-sm font-medium leading-none text-gray-900">
          {t('research.namesLabel')}
        </label>
        <textarea
          id="researchEventNames"
          value={namesInput}
          onChange={(event) => onNamesInputChange(event.target.value)}
          placeholder={t('research.namesPlaceholder')}
          disabled={isStarting || isRunning}
          className="min-h-32 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {parsedNamesCount > 0 ? (
          <p className="text-xs text-gray-500">
            {parsedNamesCount === 1
              ? t('research.namesHintOne')
              : t('research.namesHint', { count: parsedNamesCount })}
          </p>
        ) : null}
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <span className="font-medium text-gray-900">{t('research.configuration')}</span>
        {' · '}gpt-5.6-terra{' · '}{t('research.nativeSearch')}{' · '}{t('research.concurrency')}
      </div>
      <div className="max-w-3xl border-t border-gray-100 pt-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t('research.historyTitle')}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{t('research.historyHint')}</p>
          </div>
          {isLoadingHistory ? <span className="text-xs text-gray-500">{t('research.historyLoading')}</span> : null}
        </div>
        {hasHistoryError ? (
          <ErrorMessage
            variant="inline"
            title={t('research.historyError')}
            message={t('research.historyError')}
            onRetry={onRetryHistory}
          />
        ) : history.length === 0 && !isLoadingHistory ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
            {t('research.historyEmpty')}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {history.map(({ batch, summary }) => {
              const isSelected = batch.id === activeBatchId;

              return (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => onSelectBatch(batch.id)}
                  aria-pressed={isSelected}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${isSelected ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {batch.model}
                    </span>
                    <span className={`mt-0.5 block text-xs tabular-nums ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                      {new Intl.DateTimeFormat(undefined, {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      }).format(new Date(batch.createdAt))}
                    </span>
                  </span>
                  <span className={`self-center text-right text-xs tabular-nums ${isSelected ? 'text-gray-200' : 'text-gray-600'}`}>
                    <span className="block font-medium">{t(`research.state.${batch.status}`)}</span>
                    <span className="mt-0.5 block">
                      {t('research.historySummary', {
                        completed: summary.completed,
                        failed: summary.failed,
                        total: summary.total,
                      })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

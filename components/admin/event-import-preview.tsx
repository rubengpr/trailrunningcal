'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';
import { Button } from '@/components/ui/button';

interface EventImportPreviewProps {
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  isLoading: boolean;
  error: string | null;
  emptyMessage?: string | null;
  emptyAction?: ReactNode;
  onAccept: () => Promise<void>;
  isAccepted: boolean;
  isAccepting: boolean;
}

export function EventImportPreview({
  event,
  races,
  isLoading,
  error,
  emptyMessage,
  emptyAction,
  onAccept,
  isAccepted,
  isAccepting,
}: EventImportPreviewProps): React.ReactElement {
  const t = useTranslations('admin.events.import.results');

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <div className="pipeline-loading-dot mb-3 inline-block h-4 w-4 rounded-full bg-gray-300" />
        <p className="text-sm text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-800">{t('errorTitle')}</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!event || races.length === 0) {
    return (
      <div className="flex items-center gap-4 overflow-hidden rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-2 overflow-hidden">
          <p className="shrink-0 text-sm font-medium text-red-800">
            {t('noResultsTitle')}
          </p>
          {emptyMessage && (
            <p className="min-w-0 truncate text-sm text-red-600">
              {emptyMessage}
            </p>
          )}
        </div>
        {emptyAction && <div className="shrink-0">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{event.name}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {t('raceCount', { count: races.length })}
          </p>
        </div>
        <Button onClick={onAccept} disabled={isAccepted || isAccepting}>
          {isAccepted
            ? t('accepted')
            : isAccepting
              ? t('accepting')
              : t('acceptEvent')}
        </Button>
      </div>

      {event.description && (
        <div className="whitespace-pre-line rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700">
          {event.description}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">{t('raceName')}</th>
              <th className="px-4 py-3">{t('date')}</th>
              <th className="px-4 py-3">{t('location')}</th>
              <th className="px-4 py-3 text-right">{t('distance')}</th>
              <th className="px-4 py-3 text-right">{t('elevation')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {races.map((race, index) => (
              <tr key={`${race.name}-${index}`}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {race.name}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {race.date ?? t('unknown')}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {race.city}, {race.province}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                  {race.distanceKm}K
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                  {race.elevationGainM ?? t('unknown')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

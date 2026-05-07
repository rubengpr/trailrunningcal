'use client';

import { useTranslations } from 'next-intl';
import type { RaceImportBatchItemStatus } from '@/types/races-import-api.types';

export type BulkProcessState = RaceImportBatchItemStatus;

export interface BulkProcessTableRow {
    id: string;
    url: string;
    status: BulkProcessState;
    raceCount: number | null;
    updatedAt: string;
}

interface BulkProcessTableProps {
    rows: BulkProcessTableRow[];
    onViewResult: (itemId: string) => void;
    viewingItemId?: string | null;
}

function StateBadge({ state }: { state: BulkProcessState }) {
    const t = useTranslations('admin.races.import.bulk');
    const dotColor: Record<BulkProcessState, string> = {
        completed: 'bg-green-500',
        running: 'bg-purple-500',
        pending: 'bg-gray-300',
        failed: 'bg-red-500',
    };
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-gray-700">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor[state]}`} aria-hidden />
            {t(`state.${state}`)}
        </span>
    );
}

function RaceCountCell({ raceCount }: { raceCount: number | null }) {
    if (raceCount === null) {
        return <span className="text-gray-300">—</span>;
    }
    return <span className="tabular-nums text-gray-700">{raceCount}</span>;
}

function formatUpdatedAt(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function BulkProcessTable({ rows, onViewResult, viewingItemId }: BulkProcessTableProps) {
    const t = useTranslations('admin.races.import.bulk');

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-gray-100 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            <th className="py-2 pr-3 font-medium">{t('columns.url')}</th>
                            <th className="py-2 pr-3 font-medium">{t('columns.status')}</th>
                            <th className="py-2 pr-3 font-medium">{t('columns.suggestedRaces')}</th>
                            <th className="py-2 pr-3 font-medium">{t('columns.updatedAt')}</th>
                            <th className="py-2 pr-0 text-right font-medium">{t('columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-gray-50 last:border-b-0">
                                <td className="max-w-[260px] truncate py-2.5 pr-3 text-gray-700">
                                    {row.url.replace(/^https?:\/\/(www\.)?/, '')}
                                </td>
                                <td className="py-2.5 pr-3">
                                    <StateBadge state={row.status} />
                                </td>
                                <td className="py-2.5 pr-3">
                                    <RaceCountCell raceCount={row.raceCount} />
                                </td>
                                <td className="py-2.5 pr-3 text-gray-500 tabular-nums">
                                    {formatUpdatedAt(row.updatedAt)}
                                </td>
                                <td className="py-2.5 pr-0 text-right">
                                    {row.status === 'completed' ? (
                                        <button
                                            type="button"
                                            onClick={() => onViewResult(row.id)}
                                            disabled={viewingItemId === row.id}
                                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {viewingItemId === row.id ? t('actions.loading') : t('actions.viewResult')}
                                        </button>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

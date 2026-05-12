'use client';

import { useTranslations } from 'next-intl';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import type { RaceImportItemStatus } from '@/types/races-import-api.types';
import { triggerDownload } from '@/lib/download-utils';
import { cleanUrl } from '@/lib/url-utils';

export type BulkProcessState = RaceImportItemStatus;

export interface BulkProcessTableRow {
    id: string;
    url: string;
    status: BulkProcessState;
    raceCount: number | null;
    updatedAt: string;
    markdown: string | null;
    rawModelOutput: string | null;
}

interface BulkProcessTableProps {
    rows: BulkProcessTableRow[];
}

function StateBadge({ state }: { state: BulkProcessState }) {
    const t = useTranslations('admin.races.import.bulk');
    const dotColor: Record<BulkProcessState, string> = {
        completed: 'bg-green-400',
        running: 'bg-purple-400',
        pending: 'bg-gray-300',
        failed: 'bg-red-400',
    };
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full py-0.5 font-medium text-gray-700">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor[state]}`} aria-hidden />
            {t(`state.${state}`)}
        </span>
    );
}

function RaceCountCell({ raceCount }: { raceCount: number | null }) {
    if (raceCount === null) return null;
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


export function BulkProcessTable({ rows }: BulkProcessTableProps) {
    const t = useTranslations('admin.races.import.bulk');

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-x-8 text-left text-xs">
                    <thead>
                        <tr className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            <th className="w-[45%] border-b border-gray-100 py-2 font-medium">{t('columns.url')}</th>
                            <th className="border-b border-gray-100 py-2 font-medium">{t('columns.status')}</th>
                            <th className="w-16 border-b border-gray-100 py-2 text-right font-medium">{t('columns.suggestedRaces')}</th>
                            <th className="border-b border-gray-100 py-2 font-medium">{t('columns.updatedAt')}</th>
                            <th className="border-b border-gray-100 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const hostname = (() => {
                                try {
                                    return new URL(row.url).hostname.replace(/^www\./, '');
                                } catch {
                                    return 'file';
                                }
                            })();

                            return (
                                <tr key={row.id} className="group align-middle">
                                    <td className="max-w-[260px] truncate border-b border-gray-50 py-2.5 group-last:border-b-0">
                                        <a
                                            href={row.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-700 hover:underline"
                                        >
                                            {cleanUrl(row.url)}
                                        </a>
                                    </td>
                                    <td className="border-b border-gray-50 py-2.5 group-last:border-b-0">
                                        <StateBadge state={row.status} />
                                    </td>
                                    <td className="border-b border-gray-50 py-2.5 text-right group-last:border-b-0">
                                        <RaceCountCell raceCount={row.raceCount} />
                                    </td>
                                    <td className="border-b border-gray-50 py-2.5 text-gray-500 tabular-nums group-last:border-b-0">
                                        {(row.status === 'completed' || row.status === 'failed') && formatUpdatedAt(row.updatedAt)}
                                    </td>
                                    <td className="border-b border-gray-50 py-2.5 text-right group-last:border-b-0">
                                        {row.status === 'completed' ? (
                                            <IconActionMenu
                                                triggerAriaLabel={t('columns.actions')}
                                                size="sm"
                                                items={[
                                                    {
                                                        id: 'downloadMarkdown',
                                                        label: t('actions.downloadMarkdown'),
                                                        disabled: !row.markdown,
                                                        onSelect: () => {
                                                            if (row.markdown) {
                                                                triggerDownload(row.markdown, `crawl-${hostname}.md`, 'text/markdown');
                                                            }
                                                        },
                                                    },
                                                    {
                                                        id: 'downloadJson',
                                                        label: t('actions.downloadJson'),
                                                        disabled: !row.rawModelOutput,
                                                        onSelect: () => {
                                                            if (row.rawModelOutput) {
                                                                triggerDownload(row.rawModelOutput, `model-raw-${hostname}.json`, 'application/json;charset=utf-8');
                                                            }
                                                        },
                                                    },
                                                ]}
                                            />
                                        ) : null}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

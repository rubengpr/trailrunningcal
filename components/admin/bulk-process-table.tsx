'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import type {
    EventImportItemReviewStatus,
    EventImportItemStatus,
} from '@/types/events-import-api.types';
import { triggerDownload } from '@/lib/utils/download';
import { cleanUrl } from '@/lib/utils/url';

export type BulkProcessState = EventImportItemStatus;

export interface BulkProcessTableRow {
    id: string;
    url: string;
    status: BulkProcessState;
    reviewStatus: EventImportItemReviewStatus;
    acceptedEventId: string | null;
    raceCount: number | null;
    error: string | null;
    updatedAt: string;
    markdown: string | null;
    rawModelOutput: string | null;
}

const STATE_DOT_COLOR: Record<BulkProcessState, string> = {
    completed: 'bg-green-400',
    running: 'bg-purple-400',
    pending: 'bg-gray-300',
    failed: 'bg-red-400',
};

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

interface BulkProcessTableProps {
    rows: BulkProcessTableRow[];
    translationsNamespace?: 'admin.events.import.bulk';
    viewingRowId?: string | null;
    onViewResult?: (rowId: string) => void;
}

function StateBadge({
    state,
    translationsNamespace,
}: {
    state: BulkProcessState;
    translationsNamespace: 'admin.events.import.bulk';
}) {
    const t = useTranslations(translationsNamespace);
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full py-0.5 font-medium text-gray-700">
            <span className={`h-2 w-2 shrink-0 rounded-full ${STATE_DOT_COLOR[state]}`} aria-hidden />
            {t(`state.${state}`)}
        </span>
    );
}

function RaceCountCell({ raceCount }: { raceCount: number | null }) {
    if (raceCount === null) return null;
    return <span className="tabular-nums text-gray-700">{raceCount}</span>;
}

function formatUpdatedAt(value: string): string {
    return UPDATED_AT_FORMATTER.format(new Date(value));
}


export function BulkProcessTable({
    rows,
    translationsNamespace = 'admin.events.import.bulk',
    viewingRowId = null,
    onViewResult,
}: BulkProcessTableProps) {
    const t = useTranslations(translationsNamespace);
    const locale = useLocale();

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-left text-xs">
                    <thead>
                        <tr className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            <th className="w-[45%] border-b border-gray-100 px-4 py-2 font-medium">{t('columns.url')}</th>
                            <th className="border-b border-gray-100 px-4 py-2 font-medium">{t('columns.status')}</th>
                            <th className="border-b border-gray-100 px-4 py-2">
                                <span className="sr-only">{t('columns.error')}</span>
                            </th>
                            <th className="w-16 border-b border-gray-100 px-4 py-2 text-right font-medium">{t('columns.suggestedRaces')}</th>
                            <th className="border-b border-gray-100 px-4 py-2 font-medium">{t('columns.updatedAt')}</th>
                            <th className="border-b border-gray-100 px-4 py-2">
                                <span className="sr-only">{t('columns.actions')}</span>
                            </th>
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
                                <tr
                                    key={row.id}
                                    className={`group align-middle ${row.reviewStatus === 'accepted' ? 'bg-green-50' : ''}`}
                                >
                                    <td className="max-w-[260px] truncate border-b border-gray-50 px-4 py-2.5 group-last:border-b-0">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <a
                                                href={row.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="min-w-0 truncate text-gray-700 hover:underline"
                                            >
                                                {cleanUrl(row.url)}
                                            </a>
                                            {row.acceptedEventId ? (
                                                <Link
                                                    href={`/${locale}/admin/eventos/${row.acceptedEventId}`}
                                                    title={t('actions.openEvent')}
                                                    aria-label={t('actions.openEvent')}
                                                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-green-800 transition-colors hover:bg-green-100"
                                                >
                                                    <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />
                                                </Link>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="border-b border-gray-50 px-4 py-2.5 group-last:border-b-0">
                                        <StateBadge state={row.status} translationsNamespace={translationsNamespace} />
                                    </td>
                                    <td className="border-b border-gray-50 px-4 py-2.5 group-last:border-b-0">
                                        {row.status === 'failed' && row.error && (
                                            <span className="text-xs text-red-600">{row.error}</span>
                                        )}
                                    </td>
                                    <td className="border-b border-gray-50 px-4 py-2.5 text-right group-last:border-b-0">
                                        <RaceCountCell raceCount={row.raceCount} />
                                    </td>
                                    <td className="border-b border-gray-50 px-4 py-2.5 text-gray-500 tabular-nums group-last:border-b-0">
                                        {(row.status === 'completed' || row.status === 'failed') && formatUpdatedAt(row.updatedAt)}
                                    </td>
                                    <td className="border-b border-gray-50 px-4 py-2.5 text-right group-last:border-b-0">
                                        {row.status === 'completed' ? (
                                            <IconActionMenu
                                                triggerAriaLabel={t('columns.actions')}
                                                size="sm"
                                                items={[
                                                    ...(onViewResult
                                                        ? [
                                                            {
                                                                id: 'viewResult',
                                                                label: viewingRowId === row.id ? t('actions.loading') : t('actions.viewResult'),
                                                                disabled: viewingRowId !== null,
                                                                onSelect: () => {
                                                                    onViewResult(row.id);
                                                                },
                                                            },
                                                        ]
                                                        : []),
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
                                        ) : row.status === 'failed' && row.markdown ? (
                                            <IconActionMenu
                                                triggerAriaLabel={t('columns.actions')}
                                                size="sm"
                                                items={[
                                                    {
                                                        id: 'downloadMarkdown',
                                                        label: t('actions.downloadMarkdown'),
                                                        onSelect: () => {
                                                            triggerDownload(row.markdown!, `crawl-${hostname}.md`, 'text/markdown');
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

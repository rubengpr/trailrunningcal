'use client';

import { useTranslations } from 'next-intl';
import { formatDurationMs } from '@/lib/format-duration';

type BulkProcessState = 'completed' | 'processing' | 'failed';

interface BulkProcessRow {
    url: string;
    scrapeMs: number | null;
    parseMs: number | null;
    state: BulkProcessState;
}

const FIXTURE_ROWS: BulkProcessRow[] = [
    {
        url: 'https://ultratrailcollserola.cat/inscripcions',
        scrapeMs: 4200,
        parseMs: 6800,
        state: 'completed',
    },
    {
        url: 'https://cursamontserrat.cat/2026',
        scrapeMs: 3100,
        parseMs: null,
        state: 'processing',
    },
    {
        url: 'https://trailpallars.cat/event',
        scrapeMs: 5300,
        parseMs: null,
        state: 'failed',
    },
];

function StateBadge({ state }: { state: BulkProcessState }) {
    const t = useTranslations('admin.races.scrape.bulk');
    const dotColor: Record<BulkProcessState, string> = {
        completed: 'bg-green-500',
        processing: 'bg-purple-500',
        failed: 'bg-red-500',
    };
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-gray-700">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor[state]}`} aria-hidden />
            {t(`state.${state}`)}
        </span>
    );
}

function TimeCell({ ms }: { ms: number | null }) {
    if (ms === null) {
        return <span className="text-gray-300">—</span>;
    }
    return <span className="tabular-nums text-gray-700">{formatDurationMs(ms)}</span>;
}

export function BulkProcessTable() {
    const t = useTranslations('admin.races.scrape.bulk');

    return (
        <div className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-gray-100 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                            <th className="py-2 pr-3 font-medium">{t('columns.url')}</th>
                            <th className="py-2 pr-3 font-medium">{t('columns.scrape')}</th>
                            <th className="py-2 pr-3 font-medium">{t('columns.parsing')}</th>
                            <th className="py-2 pr-0 text-right font-medium" aria-hidden></th>
                        </tr>
                    </thead>
                    <tbody>
                        {FIXTURE_ROWS.map((row, index) => (
                            <tr
                                key={index}
                                className="border-b border-gray-50 last:border-b-0"
                            >
                                <td className="max-w-[260px] truncate py-2.5 pr-3 text-gray-700">
                                    {row.url.replace(/^https?:\/\/(www\.)?/, '')}
                                </td>
                                <td className="py-2.5 pr-3">
                                    <TimeCell ms={row.scrapeMs} />
                                </td>
                                <td className="py-2.5 pr-3">
                                    <TimeCell ms={row.parseMs} />
                                </td>
                                <td className="py-2.5 pr-0 text-right">
                                    <StateBadge state={row.state} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

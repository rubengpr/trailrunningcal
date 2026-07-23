'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, Eye, LoaderCircle } from 'lucide-react';
import { IconActionMenu } from '@/components/ui/icon-action-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <Table className="text-sm">
      <TableHeader>
        <TableCell header className="w-[45%]">{t('columns.url')}</TableCell>
        <TableCell header>{t('columns.status')}</TableCell>
        <TableCell header muted>
          <span className="sr-only">{t('columns.error')}</span>
        </TableCell>
        <TableCell header align="right" className="w-16">
          {t('columns.suggestedRaces')}
        </TableCell>
        <TableCell header>{t('columns.updatedAt')}</TableCell>
        <TableCell header align="right">{t('columns.actions')}</TableCell>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const hostname = (() => {
            try {
              return new URL(row.url).hostname.replace(/^www\./, '');
            } catch {
              return 'file';
            }
          })();

          const rowColor = row.reviewStatus === 'accepted'
            ? 'bg-green-50 hover:bg-green-100'
            : 'hover:bg-gray-100';

          return (
            <TableRow
              key={row.id}
              className={`align-middle transition-colors duration-150 ${rowColor}`}
            >
              <TableCell className="max-w-[260px]">
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
              </TableCell>
              <TableCell>
                <StateBadge state={row.status} translationsNamespace={translationsNamespace} />
              </TableCell>
              <TableCell>
                {row.status === 'failed' && row.error && (
                  <span className="text-xs text-red-600">{row.error}</span>
                )}
              </TableCell>
              <TableCell align="right">
                <RaceCountCell raceCount={row.raceCount} />
              </TableCell>
              <TableCell className="text-gray-500 tabular-nums">
                {(row.status === 'completed' || row.status === 'failed') &&
                  formatUpdatedAt(row.updatedAt)}
              </TableCell>
              <TableCell align="right">
                <div className="inline-flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onViewResult?.(row.id)}
                    disabled={
                      row.status !== 'completed' ||
                      viewingRowId !== null ||
                      !onViewResult
                    }
                    title={
                      viewingRowId === row.id
                        ? t('actions.loading')
                        : t('actions.viewResult')
                    }
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {viewingRowId === row.id ? (
                      <LoaderCircle className="size-4 animate-spin" strokeWidth={1.5} />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.5} />
                    )}
                  </button>
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
                            triggerDownload(
                              row.rawModelOutput,
                              `model-raw-${hostname}.json`,
                              'application/json;charset=utf-8',
                            );
                          }
                        },
                      },
                    ]}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

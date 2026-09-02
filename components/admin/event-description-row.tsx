import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { cleanUrl } from '@/lib/utils/url';
import type { TrailEventDetail } from '@/types/event.types';

export type EventDescriptionRowStatus =
  | 'idle'
  | 'generating'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'failed';

interface EventDescriptionRowLabels {
  missingUrl: string;
  review: string;
  generating: string;
  generate: string;
  status: string;
}

interface EventDescriptionRowProps {
  eventDetail: TrailEventDetail;
  locale: string;
  isSelected: boolean;
  status: EventDescriptionRowStatus;
  currentDescription: string;
  draftDescription: string;
  updatedAt: string | null;
  error?: string;
  labels: EventDescriptionRowLabels;
  onToggleSelected: () => void;
  onOpenReview: () => void;
  onGenerate: () => void;
}

const STATUS_DOT_COLOR: Record<EventDescriptionRowStatus, string> = {
  idle: 'bg-gray-300',
  generating: 'bg-purple-400',
  ready: 'bg-blue-400',
  saving: 'bg-purple-400',
  saved: 'bg-green-400',
  failed: 'bg-red-400',
};

function formatUpdatedAt(value: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year}, ${hours}:${minutes}`;
}

function DescriptionCell({ current, draft }: { current: string; draft: string }): React.ReactElement {
  const text = draft || current;
  if (!text) return <span className="text-gray-400">—</span>;

  const truncated = text.length > 80 ? `${text.slice(0, 80)}…` : text;

  return (
    <span className={draft ? 'text-blue-700' : 'text-gray-700'} title={text}>
      {truncated}
    </span>
  );
}

export function EventDescriptionRow({
  eventDetail,
  locale,
  isSelected,
  status,
  currentDescription,
  draftDescription,
  updatedAt,
  error,
  labels,
  onToggleSelected,
  onOpenReview,
  onGenerate,
}: EventDescriptionRowProps): React.ReactElement {
  const event = eventDetail.event;
  const canGenerate = Boolean(event.websiteUrl) && status !== 'generating';

  return (
    <tr className="group align-middle transition-colors duration-150 hover:bg-gray-100">
      <td className="py-3 pl-4 pr-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelected}
          disabled={!event.websiteUrl}
          className="h-4 w-4"
        />
      </td>
      <td className="max-w-[200px] px-4 py-3">
        <Link
          href={`/${locale}/e/${event.slug}`}
          prefetch={false}
          className="block truncate text-sm font-medium text-gray-900 hover:underline"
        >
          {event.name}
        </Link>
      </td>
      <td className="max-w-[180px] px-4 py-3">
        {event.websiteUrl ? (
          <a
            href={event.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-gray-500 hover:text-gray-800 hover:underline"
          >
            {cleanUrl(event.websiteUrl)}
          </a>
        ) : (
          <span className="text-red-600">{labels.missingUrl}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
        {eventDetail.allRaceCount}
      </td>
      <td className="max-w-[240px] px-4 py-3">
        <button
          type="button"
          onClick={onOpenReview}
          className="w-full text-left transition-opacity hover:opacity-70"
        >
          <DescriptionCell current={currentDescription} draft={draftDescription} />
        </button>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
        {formatUpdatedAt(updatedAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLOR[status]}`} aria-hidden />
          {labels.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {status === 'ready' ? (
            <IconButton onClick={onOpenReview} title={labels.review}>
              <Search className="h-4 w-4" strokeWidth={1.5} />
            </IconButton>
          ) : null}
          <IconButton
            onClick={onGenerate}
            disabled={!canGenerate}
            title={status === 'generating' ? labels.generating : labels.generate}
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

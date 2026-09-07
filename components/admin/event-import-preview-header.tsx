import { Calendar, Check, Globe, MapPin, TextCursor, WholeWord, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ReviewActionButton } from '@/components/admin/review-action-button';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

interface EventImportPreviewHeaderProps {
  event: TrailEventAgentEvent;
  races: TrailEventAgentRace[];
  eventDate: string;
  eventLocation: string;
  description?: string;
  websiteUrl?: string;
  readOnly: boolean;
  isActionDisabled: boolean;
  isAccepted: boolean;
  isAccepting: boolean;
  isRejected: boolean;
  showReject: boolean;
  onAccept: () => Promise<void>;
  onReject: () => void;
  onEdit: () => void;
  onSaveDraft?: (
    event: TrailEventAgentEvent,
    races: TrailEventAgentRace[],
  ) => Promise<void>;
  isSavingDraft: boolean;
  isDraftSaved: boolean;
}

export function EventImportPreviewHeader({
  event,
  races,
  eventDate,
  eventLocation,
  description,
  websiteUrl,
  readOnly,
  isActionDisabled,
  isAccepted,
  isAccepting,
  isRejected,
  showReject,
  onAccept,
  onReject,
  onEdit,
  onSaveDraft,
  isSavingDraft,
  isDraftSaved,
}: EventImportPreviewHeaderProps): React.ReactElement {
  const t = useTranslations('admin.events.import.results');

  return (
    <section className="border-b border-gray-100 p-5 sm:p-6">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-xl font-semibold leading-tight text-gray-950">
              {event.name}
            </h2>
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t('websiteUrl')}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
          {!readOnly && (
            <div className={`${onSaveDraft ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'} flex shrink-0 items-center gap-1 transition-opacity`}>
              {onSaveDraft && (
                <button
                  type="button"
                  disabled={isActionDisabled || isSavingDraft || isDraftSaved}
                  onClick={() => void onSaveDraft(event, races)}
                  className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-35"
                >
                  {isDraftSaved ? t('draftSaved') : isSavingDraft ? t('savingDraft') : t('saveDraft')}
                </button>
              )}
              <ReviewActionButton
                title={isAccepted ? t('reviewAccepted') : t('acceptEvent')}
                disabled={isActionDisabled}
                onClick={() => void onAccept()}
                variant="primary"
              >
                {isAccepting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
              </ReviewActionButton>
              <ReviewActionButton title={t('editReview')} disabled={isActionDisabled} onClick={onEdit}>
                <TextCursor className="h-3.5 w-3.5" aria-hidden="true" />
              </ReviewActionButton>
              {showReject && (
                <ReviewActionButton
                  title={isRejected ? t('reviewRejected') : t('rejectEvent')}
                  disabled={isActionDisabled}
                  onClick={onReject}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </ReviewActionButton>
              )}
            </div>
          )}
        </div>
        <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="sr-only">{t('date')}</dt>
            <dd className="flex items-center gap-2 text-gray-900">
              <Calendar className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span>{eventDate}</span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">{t('location')}</dt>
            <dd className="flex items-center gap-2 text-gray-900">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span>{eventLocation}</span>
            </dd>
          </div>
        </dl>
      </div>
      {description && (
        <div className="mt-5 max-w-4xl">
          <p className="whitespace-pre-line text-sm leading-6 text-gray-600">{description}</p>
          <span
            title={t('descriptionCharacterCount', { count: description.length })}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-gray-200/60 bg-gray-50 px-2 text-[11px] font-medium tabular-nums text-gray-600"
          >
            <WholeWord className="size-3" strokeWidth={2} aria-hidden="true" />
            {description.length}
          </span>
        </div>
      )}
    </section>
  );
}

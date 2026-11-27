'use client';

import type { ComponentProps } from 'react';
import { EventImportPreview } from '@/components/admin/event-import-preview';
import { EventImportPreviewModal } from '@/components/admin/event-import-preview-modal';

type PreviewProps = ComponentProps<typeof EventImportPreview>;
type ReviewActions = Pick<PreviewProps, 'onAccept' | 'onSaveReview'>
  & Partial<Pick<PreviewProps,
    'isAccepted' | 'isAccepting' | 'onReject' | 'isRejected'
    | 'onSaveDraft' | 'isSavingDraft' | 'isDraftSaved'
  >>;

interface EventImportResultModalProps {
  result: Pick<PreviewProps, 'event' | 'races'> | null;
  closeLabel: string;
  onClose: () => void;
  reviewActions?: ReviewActions;
}

export function EventImportResultModal({
  result,
  closeLabel,
  onClose,
  reviewActions,
}: EventImportResultModalProps) {
  if (!result) return null;

  return (
    <EventImportPreviewModal isOpen closeLabel={closeLabel} onClose={onClose}>
      <EventImportPreview
        event={result.event}
        races={result.races}
        isLoading={false}
        error={null}
        readOnly={!reviewActions}
        onAccept={reviewActions?.onAccept ?? (async () => undefined)}
        isAccepted={reviewActions?.isAccepted ?? false}
        isAccepting={reviewActions?.isAccepting ?? false}
        onReject={reviewActions?.onReject ?? (() => undefined)}
        isRejected={reviewActions?.isRejected ?? false}
        showReject={Boolean(reviewActions?.onReject)}
        onSaveReview={reviewActions?.onSaveReview ?? (() => undefined)}
        onSaveDraft={reviewActions?.onSaveDraft}
        isSavingDraft={reviewActions?.isSavingDraft}
        isDraftSaved={reviewActions?.isDraftSaved}
      />
    </EventImportPreviewModal>
  );
}

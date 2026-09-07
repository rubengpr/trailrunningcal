import { useTranslations } from 'next-intl';

import { Tooltip } from '@/components/ui/tooltip';
import type { EventUpdateBatchItemStatus } from '@/types/event-update.types';

interface EventUpdateStatusDotProps {
  status: EventUpdateBatchItemStatus;
}

function statusDotClass(status: EventUpdateBatchItemStatus): string {
  return {
    pending: 'bg-amber-500',
    running: 'bg-violet-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
  }[status];
}

export function EventUpdateStatusDot({ status }: EventUpdateStatusDotProps): React.ReactElement {
  const t = useTranslations('admin.events.updates');

  return (
    <Tooltip text={t(`status.${status}`)} size="sm">
      <span className={`size-2.5 rounded-full ${statusDotClass(status)}`} />
    </Tooltip>
  );
}

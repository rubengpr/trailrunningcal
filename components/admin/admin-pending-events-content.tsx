'use client';

import { AdminPendingQueueContent } from '@/components/admin/admin-pending-queue-content';
import { addPendingEvents, deletePendingEvent } from '@/lib/api/pending-events';
import type { PendingEvent } from '@/types/pending-event.types';

interface AdminPendingEventsContentProps {
    entries: PendingEvent[];
}

export function AdminPendingEventsContent({ entries }: AdminPendingEventsContentProps) {
    return (
        <AdminPendingQueueContent
            entries={entries}
            namespace="admin.events.queue"
            addEntries={addPendingEvents}
            deleteEntry={deletePendingEvent}
        />
    );
}

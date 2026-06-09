'use client';

import { AdminPendingQueueContent } from '@/components/admin/admin-pending-queue-content';
import { addPendingRaces, deletePendingRace } from '@/lib/api/pending-races';
import type { PendingRace } from '@/types/pending-race.types';

interface AdminPendingRacesContentProps {
    entries: PendingRace[];
}

export function AdminPendingRacesContent({ entries }: AdminPendingRacesContentProps) {
    return (
        <AdminPendingQueueContent
            entries={entries}
            namespace="admin.races.queue"
            addEntries={addPendingRaces}
            deleteEntry={deletePendingRace}
        />
    );
}

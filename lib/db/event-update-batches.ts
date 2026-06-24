import { createAdminClient } from '@/lib/supabase/server';
import type {
  EventUpdateBatch,
  EventUpdateBatchRow,
} from '@/types/event-update.types';

function toBatch(row: EventUpdateBatchRow): EventUpdateBatch {
  return {
    id: row.id,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEventUpdateBatch(input: {
  referenceDate: string;
}): Promise<EventUpdateBatch | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('create_event_update_batch', {
    p_reference_date: input.referenceDate,
  });

  if (error) {
    console.error('Event update batch rpc error:', error);
    throw new Error('Failed to create event update batch');
  }

  if (!data || data.length === 0) {
    return null;
  }

  return toBatch(data[0] as EventUpdateBatchRow);
}

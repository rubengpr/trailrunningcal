import { createAdminClient } from '@/lib/supabase/server';
import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type {
  RaceImportBatch,
  RaceImportBatchItem,
  RaceImportItemRow,
  RaceImportBatchStatus,
  RaceImportBatchSnapshot,
  RaceImportRow,
  RaceImportResult,
} from '@/types/races-import-api.types';

function toBatch(row: RaceImportRow): RaceImportBatch {
  return {
    id: row.id,
    status: row.status,
    model: row.model,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: RaceImportItemRow): RaceImportBatchItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    url: row.url,
    status: row.status,
    raceCount: row.race_count,
    error: row.error,
    markdown: row.result?.markdown ?? null,
    rawModelOutput: row.result?.rawModelOutput ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSummary(items: RaceImportBatchItem[]) {
  return items.reduce(
    (summary, item) => ({
      ...summary,
      [item.status]: summary[item.status] + 1,
    }),
    {
      total: items.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    },
  );
}

export async function createRaceImportBatch(input: {
  urls: string[];
  model: OpenRouterScrapeModelId;
}): Promise<RaceImportBatch> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('create_race_import_batch', {
    p_urls: input.urls,
    p_model: input.model,
  });

  if (error || !data || data.length === 0) {
    console.error('Race import batch rpc error:', error);
    throw new Error('Failed to create race import batch');
  }

  return toBatch(data[0] as RaceImportRow);
}

export async function setBatchWorkflowRunId(input: {
  batchId: string;
  workflowRunId: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('race_import_batches')
    .update({
      workflow_run_id: input.workflowRunId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.batchId);

  if (error) {
    console.error('Race import batch workflow run update error:', error);
    throw new Error('Failed to update race import batch workflow run');
  }
}

export async function getRaceImportBatch(
  batchId: string,
): Promise<RaceImportBatch | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('race_import_batches')
    .select('id, status, model, workflow_run_id, created_at, updated_at')
    .eq('id', batchId)
    .maybeSingle();

  if (error) {
    console.error('Race import batch fetch error:', error);
    throw new Error('Failed to fetch race import batch');
  }

  return data ? toBatch(data as RaceImportRow) : null;
}

export async function getPendingBatchItems(
  batchId: string,
): Promise<RaceImportBatchItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('race_import_batch_items')
    .select(
      'id, batch_id, url, status, result, race_count, error, created_at, updated_at',
    )
    .eq('batch_id', batchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Race import batch items fetch error:', error);
    throw new Error('Failed to fetch race import batch items');
  }

  return ((data ?? []) as RaceImportItemRow[]).map(toItem);
}

export async function getBatchStatus(
  batchId: string,
): Promise<RaceImportBatchSnapshot | null> {
  const [batch, items] = await Promise.all([
    getRaceImportBatch(batchId),
    getBatchItems(batchId),
  ]);

  if (!batch) {
    return null;
  }

  return {
    batch,
    summary: buildSummary(items),
    items,
  };
}

export async function getBatchItems(
  batchId: string,
): Promise<RaceImportBatchItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('race_import_batch_items')
    .select(
      'id, batch_id, url, status, result, race_count, error, created_at, updated_at',
    )
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Race import batch items fetch error:', error);
    throw new Error('Failed to fetch race import batch items');
  }

  return ((data ?? []) as RaceImportItemRow[]).map(toItem);
}

export async function updateBatchStatus(
  batchId: string,
  status: RaceImportBatchStatus,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('race_import_batches')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  if (error) {
    console.error('Race import batch status update error:', error);
    throw new Error('Failed to update race import batch status');
  }
}

export async function markBatchItemRunning(itemId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('race_import_batch_items')
    .update({
      status: 'running',
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Race import item running update error:', error);
    throw new Error('Failed to update race import item');
  }
}

export async function markBatchItemCompleted(
  itemId: string,
  input: {
    result: RaceImportResult | null;
    raceCount: number;
  },
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('race_import_batch_items')
    .update({
      status: 'completed',
      result: input.result,
      race_count: input.raceCount,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Race import item completed update error:', error);
    throw new Error('Failed to complete race import item');
  }
}

export async function markBatchItemFailed(
  itemId: string,
  errorMessage: string,
  markdown?: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('race_import_batch_items')
    .update({
      status: 'failed',
      error: errorMessage,
      result: markdown ? ({ markdown } as RaceImportResult) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) {
    console.error('Race import item failed update error:', error);
    throw new Error('Failed to fail race import item');
  }
}

export async function getItemResult(
  itemId: string,
): Promise<RaceImportResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('race_import_batch_items')
    .select('result')
    .eq('id', itemId)
    .eq('status', 'completed')
    .maybeSingle();

  if (error) {
    console.error('Race import item result fetch error:', error);
    throw new Error('Failed to fetch race import item result');
  }

  return (data?.result as RaceImportResult | null) ?? null;
}

import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/integrations/openrouter/scrape-models';
import type { PageStats } from '@/types/races-scrape-api.types';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type {
  RaceImportBatchSnapshot,
  RaceImportRequest,
  RaceImportResult,
} from '@/types/races-import-api.types';
import type { ConflictingRace } from '@/types/race.types';

export type ConflictResult = { ok: false; conflicts: ConflictingRace[] };
type MarkdownRejectedReason = 'markdown_too_long' | 'markdown_too_short';

export type MarkdownRejectedResult = {
  ok: false;
  reason: MarkdownRejectedReason;
  markdown: string;
};

const MARKDOWN_REJECTED_REASONS = new Set<string>([
  'markdown_too_long',
  'markdown_too_short',
]);

function parseMarkdownRejected(
  status: number,
  data: unknown,
): MarkdownRejectedResult | null {
  if (
    status === 422 &&
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    'markdown' in data &&
    MARKDOWN_REJECTED_REASONS.has((data as { error: string }).error)
  ) {
    const typed = data as { error: MarkdownRejectedReason; markdown: string };
    return {
      ok: false,
      reason: typed.error,
      markdown: typed.markdown ?? '',
    };
  }
  return null;
}

function parseConflict(status: number, data: unknown): ConflictResult | null {
  if (
    status === 409 &&
    typeof data === 'object' &&
    data !== null &&
    'conflicts' in data
  ) {
    return {
      ok: false,
      conflicts: (data as { conflicts: ConflictingRace[] }).conflicts,
    };
  }
  return null;
}

export async function createRace(fields: {
  date: string;
  name: string;
  distanceKm: string;
  elevationGainM: string;
  priceEur: string;
  websiteUrl: string;
  city: string;
  province: string;
  description: string;
}): Promise<{ ok: true; data: { id: string } } | ConflictResult> {
  const response = await fetch('/api/races', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: fields.date,
      name: fields.name,
      distanceKm: Number(fields.distanceKm),
      elevationGainM: parseInt(fields.elevationGainM, 10),
      priceEur: parseInt(fields.priceEur, 10),
      websiteUrl: fields.websiteUrl,
      city: fields.city,
      province: fields.province,
      description: fields.description,
    }),
  });

  const responseData = await response.json();

  const conflict = parseConflict(response.status, responseData);
  if (conflict) return conflict;

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to create race');
  }

  return { ok: true, data: responseData.data };
}

export async function updateRace(
  raceId: string,
  date: string,
  name: string,
  distanceKm: string,
  elevationGainM: string,
  websiteUrl: string,
  city: string,
  province: string,
  description: string,
) {
  const response = await fetch(`/api/races/${raceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date,
      name,
      distanceKm: Number(distanceKm),
      elevationGainM: parseInt(elevationGainM, 10),
      websiteUrl,
      city,
      province,
      description,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to update race');
  }

  return responseData;
}

export async function deleteRace(raceId: string): Promise<void> {
  const response = await fetch(`/api/races/${raceId}`, {
    method: 'DELETE',
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete race');
  }
}

export interface TrailRaceAgentRunResult {
  races: import('@/types/trail-race-agent.types').TrailRace[];
  errorMessage: string | null;
  markdown: string;
  rawModelOutput: string;
  usage: OpenRouterScrapeUsage | null;
  pageStats: PageStats;
}

export type TrailRaceAgentRunOptions =
  | { mode: 'markdown'; model: OpenRouterScrapeModelId; markdown: string }
  | { mode: 'images'; model: OpenRouterVisionModelId; images: string[] };

export async function runTrailRaceAgent(
  options: TrailRaceAgentRunOptions,
): Promise<
  { ok: true; data: TrailRaceAgentRunResult } | MarkdownRejectedResult
> {
  const body =
    options.mode === 'markdown'
      ? { markdown: options.markdown, model: options.model }
      : { images: options.images, model: options.model };

  const response = await fetch('/api/races/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const responseData = await response.json();

  const tooLong = parseMarkdownRejected(response.status, responseData);
  if (tooLong) return tooLong;

  if (!response.ok)
    throw new Error(responseData.error || 'Failed to extract races');

  return {
    ok: true,
    data: {
      ...responseData.data,
      markdown: options.mode === 'markdown' ? options.markdown : '',
    },
  };
}

export async function runRaceImport(
  options: RaceImportRequest,
): Promise<
  { ok: true; data: RaceImportResult } | ConflictResult | MarkdownRejectedResult
> {
  const response = await fetch('/api/races/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const responseData = await response.json();

  const conflict = parseConflict(response.status, responseData);
  if (conflict) return conflict;

  const tooLong = parseMarkdownRejected(response.status, responseData);
  if (tooLong) return tooLong;

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to import races');
  }

  return { ok: true, data: responseData.data };
}

export async function startRaceImportBatch(options: {
  urls: string[];
  model: OpenRouterScrapeModelId;
}): Promise<
  | { ok: true; data: { batchId: string; workflowRunId: string } }
  | ConflictResult
> {
  const response = await fetch('/api/races/import/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const responseData = await response.json();

  const conflict = parseConflict(response.status, responseData);
  if (conflict) return conflict;

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to start race import batch');
  }

  return { ok: true, data: responseData.data };
}

export async function getBatchStatus(
  batchId: string,
): Promise<RaceImportBatchSnapshot> {
  const response = await fetch(`/api/races/import/batches/${batchId}`);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to fetch race import batch');
  }

  return responseData.data;
}

export async function getItemResult(itemId: string): Promise<RaceImportResult> {
  const response = await fetch(`/api/races/import/batch-items/${itemId}`);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(
      responseData.error || 'Failed to fetch race import item result',
    );
  }

  return responseData.data;
}

// Admin-only
export async function acceptScrapedRace(
  race: import('@/types/trail-race-agent.types').TrailRace,
  websiteUrl: string,
): Promise<{ id: string }> {
  const response = await fetch('/api/races', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: race.name,
      date: race.date,
      distanceKm: race.distanceKm,
      elevationGainM: race.elevationGainM,
      priceEur: null,
      websiteUrl,
      city: race.city,
      province: race.province,
      description: race.description,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to accept race');
  }

  return responseData.data;
}

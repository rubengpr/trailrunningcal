import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats } from '@/types/races-scrape-api.types';

export type EventDescriptionBatchStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type EventDescriptionItemStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface EventDescriptionDraftResult {
  eventId: string;
  eventName: string;
  eventSlug: string;
  websiteUrl: string;
  description: string;
  errorMessage: string | null;
  markdown: string | null;
  rawModelOutput: string | null;
  usage: OpenRouterScrapeUsage | null;
  pageStats: PageStats | null;
}

export interface EventDescriptionBatch {
  id: string;
  status: EventDescriptionBatchStatus;
  model: OpenRouterScrapeModelId;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventDescriptionBatchItem {
  id: string;
  batchId: string;
  eventId: string;
  eventName: string | null;
  eventSlug: string | null;
  status: EventDescriptionItemStatus;
  error: string | null;
  description: string | null;
  markdown: string | null;
  rawModelOutput: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventDescriptionSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface EventDescriptionBatchSnapshot {
  batch: EventDescriptionBatch;
  summary: EventDescriptionSummary;
  items: EventDescriptionBatchItem[];
}

export interface EventDescriptionBatchRow {
  id: string;
  status: EventDescriptionBatchStatus;
  model: OpenRouterScrapeModelId;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventDescriptionBatchItemRow {
  id: string;
  batch_id: string;
  event_id: string;
  event_name: string | null;
  event_slug: string | null;
  status: EventDescriptionItemStatus;
  result: EventDescriptionDraftResult | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

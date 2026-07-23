import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';
import type {
  TrailEventAgentEvent,
  TrailEventAgentRace,
} from '@/types/trail-event-agent.types';

export type EventImportWorkflow =
  | 'crawlSiteExtract'
  | 'scrapePageExtract'
  | 'crawlSite'
  | 'scrapePage';

export type EventImportStepName = 'scrapePage' | 'crawlSite' | 'extract';

export type EventImportStepStatus = 'success' | 'empty' | 'failed';

export interface EventImportStep {
  name: EventImportStepName;
  status: EventImportStepStatus;
  durationMs: number;
  pageStats?: PageStats;
}

export interface EventImportResult {
  workflow: EventImportWorkflow;
  url: string;
  event: TrailEventAgentEvent | null;
  races: TrailEventAgentRace[];
  errorMessage: string | null;
  markdown: string | null;
  rawModelOutput: string | null;
  usage: OpenRouterScrapeUsage | null;
  pageStats: PageStats | null;
  scrapeUsage: ScrapeUsage | null;
  fallbackUsed: boolean | null;
  steps: EventImportStep[];
}

export type EventImportRequest =
  | {
      workflow: 'crawlSite' | 'scrapePage';
      websiteUrl: string;
      skipDuplicateCheck?: boolean;
    }
  | {
      workflow: 'crawlSiteExtract' | 'scrapePageExtract';
      websiteUrl: string;
      model: OpenRouterScrapeModelId;
      skipDuplicateCheck?: boolean;
    };

export type EventImportBatchStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type EventImportItemStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type EventImportItemReviewStatus = 'pending' | 'accepted';

export interface EventImportBatch {
  id: string;
  status: EventImportBatchStatus;
  model: OpenRouterScrapeModelId;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventImportBatchItem {
  id: string;
  batchId: string;
  url: string;
  status: EventImportItemStatus;
  reviewStatus: EventImportItemReviewStatus;
  acceptedEventId: string | null;
  acceptedEventSlug: string | null;
  reviewedAt: string | null;
  raceCount: number | null;
  error: string | null;
  markdown: string | null;
  rawModelOutput: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventImportSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface EventImportBatchSnapshot {
  batch: EventImportBatch;
  summary: EventImportSummary;
  items: EventImportBatchItem[];
}

export interface EventImportRow {
  id: string;
  status: EventImportBatchStatus;
  model: OpenRouterScrapeModelId;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventImportItemRow {
  id: string;
  batch_id: string;
  url: string;
  status: EventImportItemStatus;
  review_status: EventImportItemReviewStatus;
  accepted_event_id: string | null;
  reviewed_at: string | null;
  result: EventImportResult | null;
  race_count: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

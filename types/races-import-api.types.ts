import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats } from '@/types/races-scrape-api.types';
import type { TrailRace } from '@/types/trail-race-agent.types';

export type RaceImportWorkflow =
  | 'crawlSiteExtract'
  | 'scrapePageExtract'
  | 'crawlSite'
  | 'scrapePage';

export type RaceImportStepName = 'scrapePage' | 'crawlSite' | 'extract';

export type RaceImportStepStatus = 'success' | 'empty' | 'failed';

export interface RaceImportStep {
  name: RaceImportStepName;
  status: RaceImportStepStatus;
  durationMs: number;
  pageStats?: PageStats;
}

export interface RaceImportResult {
  workflow: RaceImportWorkflow;
  url: string;
  races: TrailRace[];
  markdown: string | null;
  rawModelOutput: string | null;
  usage: OpenRouterScrapeUsage | null;
  pageStats: PageStats | null;
  fallbackUsed: boolean | null;
  steps: RaceImportStep[];
}

export type RaceImportRequest =
  | {
      workflow: 'crawlSite' | 'scrapePage';
      websiteUrl: string;
    }
  | {
      workflow: 'crawlSiteExtract' | 'scrapePageExtract';
      websiteUrl: string;
      model: OpenRouterScrapeModelId;
    };

export type RaceImportBatchStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type RaceImportItemStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface RaceImportBatch {
  id: string;
  status: RaceImportBatchStatus;
  model: OpenRouterScrapeModelId;
  workflowRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaceImportBatchItem {
  id: string;
  batchId: string;
  url: string;
  status: RaceImportItemStatus;
  raceCount: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaceImportSummary {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface RaceImportBatchSnapshot {
  batch: RaceImportBatch;
  summary: RaceImportSummary;
  items: RaceImportBatchItem[];
}

export interface RaceImportRow {
  id: string;
  status: RaceImportBatchStatus;
  model: OpenRouterScrapeModelId;
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RaceImportItemRow {
  id: string;
  batch_id: string;
  url: string;
  status: RaceImportItemStatus;
  result: RaceImportResult | null;
  race_count: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

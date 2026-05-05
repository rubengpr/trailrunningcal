import type { OpenRouterScrapeModelId } from '@/lib/integrations/openrouter/scrape-models';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';
import type { PageStats } from '@/types/races-scrape-api.types';
import type { TrailRace } from '@/types/trail-race-agent.types';

export type RaceImportWorkflow =
  | 'autopilot'
  | 'crawlSiteExtract'
  | 'crawlMdOnly';

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
      workflow: 'crawlMdOnly';
      websiteUrl: string;
    }
  | {
      workflow: 'autopilot' | 'crawlSiteExtract';
      websiteUrl: string;
      model: OpenRouterScrapeModelId;
    };

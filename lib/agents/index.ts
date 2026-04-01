export { TRAIL_RACE_AGENT_INSTRUCTIONS } from '@/lib/prompts';
export {
  createOpenAIClient,
  hostnameFromEventUrl,
  parseJsonOutputText,
  requireOpenAIApiKey,
  runTrailRaceDomainAgent,
  runTrailRaceMarkdownAgent,
  trailRaceAgentTextFormat,
  trailRaceDomainWebSearchTools,
} from './trail-race-scraper';
export { runTrailRaceMarkdownAgentOpenRouter } from './trail-race-openrouter';
export type { TrailRaceOpenRouterAgentResult } from './trail-race-openrouter';
export { createOpenRouterClient, requireOpenRouterApiKey } from '@/lib/openrouter/openrouter-client';
export {
  OPENROUTER_SCRAPE_MODEL_IDS,
  isOpenRouterScrapeModelId,
} from '@/lib/openrouter/scrape-models';
export type { OpenRouterScrapeModelId } from '@/lib/openrouter/scrape-models';
export type {
  RunTrailRaceDomainAgentOptions,
  TrailRaceDomainAgentResult,
} from './trail-race-scraper';
export {
  requireSpiderApiKey,
  spiderCloudCrawl,
} from './spider-crawl';
export type {
  SpiderCloudCrawlOptions,
  SpiderCrawlCosts,
  SpiderCrawlPageItem,
} from './spider-crawl';
export {
  dedupeSpiderPages,
  joinSpiderCrawlPagesToMarkdown,
  normalizeSpiderCrawlUrl,
  sortSpiderPagesForJoin,
} from './spider-crawl-join-markdown';
export type { JoinSpiderCrawlMarkdownOptions } from './spider-crawl-join-markdown';

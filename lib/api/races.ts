import type {
  OpenRouterScrapeModelId,
  OpenRouterVisionModelId,
} from '@/lib/openrouter/scrape-models';
import type { CrawlPageStats } from '@/lib/spider-cloud/client';
import type { OpenRouterScrapeUsage } from '@/types/openrouter-scrape-usage.types';

/**
 * Creates a new race via the API. Safe to call from client components.
 */
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
}): Promise<{ id: string }> {
  const response = await fetch('/api/races', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: fields.date,
      name: fields.name,
      distanceKm: Number(fields.distanceKm),
      elevationGainM: Number(fields.elevationGainM),
      priceEur: parseInt(fields.priceEur, 10),
      websiteUrl: fields.websiteUrl,
      city: fields.city,
      province: fields.province,
      description: fields.description,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to create race');
  }

  return responseData.data;
}

/**
 * Updates a race via the API. Safe to call from client components.
 */
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
      elevationGainM: Number(elevationGainM),
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

/**
 * Deletes a race via the API. Safe to call from client components.
 */
export async function deleteRace(raceId: string): Promise<void> {
  const response = await fetch(`/api/races/${raceId}`, {
    method: 'DELETE',
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to delete race');
  }
}

export interface ScrapeRacesResult {
  races: import('@/types/trail-race-agent.types').TrailRaceAgentRaceRow[];
  markdown: string;
  rawModelOutput: string;
  usage: OpenRouterScrapeUsage | null;
  crawlPageStats: CrawlPageStats;
}

export type ScrapeRacesOptions =
  | { mode: 'crawlAndLlm'; model: OpenRouterScrapeModelId; websiteUrl: string }
  | {
      mode: 'markdown';
      model: OpenRouterScrapeModelId;
      markdown: string;
    }
  | { mode: 'images'; model: OpenRouterVisionModelId; images: string[] };

/**
 * Crawls an event website and returns joined markdown only (no LLM). Admin-only.
 */
export async function crawlEventWebsiteMarkdown(
  websiteUrl: string,
): Promise<{ markdown: string; crawlPageStats: CrawlPageStats }> {
  const response = await fetch('/api/races/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'crawlOnly',
      websiteUrl,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to crawl website');
  }

  return responseData.data;
}

/**
 * Scrapes a single event page (no link-following) and returns markdown only (no LLM). Admin-only.
 */
export async function scrapeEventPageMarkdown(
  websiteUrl: string,
): Promise<{ markdown: string; crawlPageStats: CrawlPageStats }> {
  const response = await fetch('/api/races/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'scrapeOnly',
      websiteUrl,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error || 'Failed to scrape page');
  }

  return responseData.data;
}

/**
 * Runs the trail race agent on a crawled URL or on uploaded markdown/images. Admin-only.
 * Routes to /api/races/scrape (URL-based) or /api/races/extract (content-based).
 */
export async function scrapeRaces(
  options: ScrapeRacesOptions,
): Promise<ScrapeRacesResult> {
  if (options.mode === 'markdown' || options.mode === 'images') {
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
    if (!response.ok) throw new Error(responseData.error || 'Failed to extract races');

    return {
      ...responseData.data,
      markdown: options.mode === 'markdown' ? options.markdown : '',
    };
  }

  const response = await fetch('/api/races/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: options.mode, websiteUrl: options.websiteUrl, model: options.model }),
  });

  const responseData = await response.json();
  if (!response.ok) throw new Error(responseData.error || 'Failed to scrape races');

  return responseData.data;
}

/**
 * Accepts a scraped race by creating it in the database. Admin-only.
 */
export async function acceptScrapedRace(
  race: import('@/types/trail-race-agent.types').TrailRaceAgentRaceRow,
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

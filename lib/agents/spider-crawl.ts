import type { CrawlPageStats } from '@/types/races-scrape-api.types';

const SPIDER_CRAWL_ENDPOINT = 'https://api.spider.cloud/crawl';

/**
 * URL patterns (regex strings) that are irrelevant to trail race data extraction.
 * Applied by default on every crawl to avoid wasting credits on media, past results,
 * legal pages, shop pages, and other non-race-info content.
 *
 * Spider.cloud matches these against each discovered URL before fetching it.
 * @see https://spider.cloud/docs/api — parameter `blacklist`
 */
export const SPIDER_CRAWL_URL_BLACKLIST: readonly string[] = [
  // Media & gallery
  'galeria',
  'gallery',
  'foto',
  'photo',
  'video',
  'imatge',
  'imagen',
  'album',
  // Past results & rankings
  'classificaci',
  'clasificacion',
  'resultats',
  'resultados',
  'results',
  'premis',
  'podis',
  // Past editions (year-based)
  'edicions-anteriors',
  'edicio-20',
  'edicion-20',
  '2010',
  '2011',
  '2012',
  '2013',
  '2014',
  '2015',
  '2016',
  '2017',
  '2018',
  '2019',
  '2020',
  '2021',
  '2022',
  '2023',
  '2024',
  // Legal & privacy
  'legal',
  'privacy',
  'privacidad',
  'privacitat',
  'cookies',
  'policy',
  'politica',
  // Shop & products
  'botiga',
  'tienda',
  'product-page',
  // Social sharing
  'xarxes',
  'sharer',
  'intent',
  // Accommodation
  'allotjaments',
  'alojamientos',
  // Kids races
  'kids',
  'infantil',
  'correxics',
  // Portfolio (unrelated website sections)
  'portfolio',
  // News & comments
  'noticies',
  'noticias',
  'news',
  'comentarios',
  'comentaris',
  // Platform / technical artifacts
  'ad_campaign',
  'settings',
  'elementor',
  'allactivity',
  '\\/help\\/',
  'pages\\/create',
  'rss',
];

export interface SpiderCrawlCosts {
  file_cost?: number;
  ai_cost?: number;
  compute_cost?: number;
  transform_cost?: number;
  total_cost?: number;
  bytes_transferred_cost?: number;
}

export interface SpiderCrawlPageItem {
  url: string;
  content: string;
  status: number;
  error: string | null;
  costs: SpiderCrawlCosts;
  /**
   * When the Spider API returns a per-page timestamp, it is preserved (ISO 8601).
   * Otherwise join-markdown fills this from the document run time.
   */
  generatedAt?: string;
}

function pickOptionalIsoTimestamp(
  raw: Record<string, unknown>,
): string | undefined {
  const keys = [
    'generated_at',
    'scraped_at',
    'created_at',
    'timestamp',
    'time',
  ] as const;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }
  }
  return undefined;
}

function normalizeSpiderCrawlPageItem(raw: unknown): SpiderCrawlPageItem {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid Spider crawl page item');
  }
  const record = raw as Record<string, unknown>;
  const costs =
    typeof record.costs === 'object' && record.costs !== null
      ? (record.costs as SpiderCrawlCosts)
      : {};
  const generatedAt = pickOptionalIsoTimestamp(record);
  const item: SpiderCrawlPageItem = {
    url: String(record.url ?? ''),
    content: String(record.content ?? ''),
    status: Number(record.status ?? 0),
    error:
      record.error === null || record.error === undefined
        ? null
        : String(record.error),
    costs,
  };
  if (generatedAt !== undefined) {
    item.generatedAt = generatedAt;
  }
  return item;
}

/**
 * Groups crawl results by HTTP status: 2xx → success, everything else → error.
 * Guarantees successCount + errorCount === pages.length.
 */
export function summarizeSpiderCrawlHttpStatus(
  pages: SpiderCrawlPageItem[],
): CrawlPageStats {
  const total = pages.length;
  let successCount = 0;
  for (const page of pages) {
    if (page.status >= 200 && page.status < 300) {
      successCount += 1;
    }
  }
  const errorCount = total - successCount;
  return { total, successCount, errorCount };
}

export function requireSpiderApiKey(): string {
  const apiKey = process.env.SPIDER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing SPIDER_API_KEY');
  }
  return apiKey;
}

export interface SpiderCloudCrawlOptions {
  limit?: number;
  depth?: number;
  request?: 'http' | 'chrome' | 'smart';
  returnFormat?: 'markdown' | 'raw' | 'text' | string;
  /**
   * Spider `wait_for`: conditions before serializing the page (network idle, delay, selector, etc.).
   * Use when critical content is filled by client-side JS after load (e.g. animated counters).
   *
   * Example — wait ~6s so distance/elevation counters finish (see Spider `delay` shape):
   * `{ delay: { secs: 6, nanos: 0 } }`
   *
   * Prefer `request: 'chrome'` (or `'smart'`) so the page runs in a browser.
   * @see https://spider.cloud/docs/api — section `wait_for`
   */
  waitFor?: Record<string, unknown>;
  /**
   * Spider `execution_scripts`: path/URL → JavaScript run in the page before capture.
   * Requires `request: 'chrome'` or `'smart'`. Alternative to a long `wait_for.delay`.
   *
   * Example:
   * `{ "https://rocanegra.cat/classica/": "await new Promise(r => setTimeout(r, 6000))" }`
   */
  executionScripts?: Record<string, string>;
  /**
   * Spider `request_timeout` (seconds per page, typically 5–255). Default 60s per
   * [efficient scraping](https://spider.cloud/docs/core/efficient-scraping). Increase if you add long `wait_for` delays.
   */
  requestTimeout?: number;
  /**
   * Spider `blacklist`: regex patterns matched against discovered URLs.
   * Any URL containing a match is skipped entirely (not fetched or counted against the limit).
   * Defaults to `SPIDER_CRAWL_URL_BLACKLIST`. Pass `[]` to disable.
   * @see https://spider.cloud/docs/api — parameter `blacklist`
   */
  blacklist?: string[];
}

const DEFAULT_SPIDER_REQUEST_TIMEOUT_SEC = 60;

export async function spiderCloudCrawl(
  seedUrl: string,
  options?: SpiderCloudCrawlOptions,
): Promise<SpiderCrawlPageItem[]> {
  try {
    new URL(seedUrl);
  } catch {
    throw new Error('Invalid seed URL');
  }

  const apiKey = requireSpiderApiKey();

  const {
    limit = 25,
    depth = 2,
    request = 'smart',
    returnFormat = 'markdown',
    waitFor,
    executionScripts,
    requestTimeout = DEFAULT_SPIDER_REQUEST_TIMEOUT_SEC,
    blacklist = [...SPIDER_CRAWL_URL_BLACKLIST],
  } = options ?? {};

  const body: Record<string, unknown> = {
    url: seedUrl,
    limit,
    depth,
    request,
    return_format: returnFormat,
    request_timeout: requestTimeout,
  };

  if (blacklist.length > 0) {
    body.blacklist = blacklist;
  }
  if (waitFor !== undefined) {
    body.wait_for = waitFor;
  }
  if (executionScripts !== undefined) {
    body.execution_scripts = executionScripts;
  }

  const response = await fetch(SPIDER_CRAWL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    console.error('Spider crawl non-JSON response:', responseText);
    throw new Error('Spider crawl returned non-JSON body');
  }

  if (!response.ok) {
    console.error('Spider crawl failed:', response.status, parsed);
    throw new Error(`Spider crawl failed: ${response.status}`);
  }

  if (!Array.isArray(parsed)) {
    console.error('Unexpected Spider crawl response shape:', parsed);
    throw new Error('Unexpected Spider crawl response shape');
  }

  return parsed.map((entry) => normalizeSpiderCrawlPageItem(entry));
}

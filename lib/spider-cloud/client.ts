// --- Constants ---

const SCRAPE_ENDPOINT = 'https://api.spider.cloud/scrape';
const CRAWL_ENDPOINT = 'https://api.spider.cloud/crawl';
const REQUEST_MODE = 'smart';
const RETURN_FORMAT = 'markdown';

// Regex patterns passed to Spider.cloud `blacklist` — matched URLs are skipped entirely.
export const BLACKLIST: readonly string[] = [
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

// --- Interfaces ---

/** Per-page HTTP outcome after Spider crawl; success + error === total always. */
export interface CrawlPageStats {
  total: number;
  successCount: number;
  errorCount: number;
}

export interface CrawlCosts {
  file_cost?: number;
  ai_cost?: number;
  compute_cost?: number;
  transform_cost?: number;
  total_cost?: number;
  bytes_transferred_cost?: number;
}

export interface CrawlPage {
  url: string;
  content: string;
  status: number;
  error: string | null;
  costs: CrawlCosts;
  // Falls back to join-markdown run time if Spider doesn't return a timestamp
  generatedAt?: string;
}

export interface ScrapeOptions {
  // Shape: `{ delay: { secs: 6, nanos: 0 } }`
  waitFor?: Record<string, unknown>;
}

export interface CrawlOptions {
  limit?: number;
  depth?: number;
  // Shape: `{ delay: { secs: 6, nanos: 0 } }`
  waitFor?: Record<string, unknown>;
}

// --- Private helpers ---

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

function normalizeCrawlPage(raw: unknown): CrawlPage {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid Spider crawl page item');
  }
  const record = raw as Record<string, unknown>;
  const costs =
    typeof record.costs === 'object' && record.costs !== null
      ? (record.costs as CrawlCosts)
      : {};
  const generatedAt = pickOptionalIsoTimestamp(record);
  const item: CrawlPage = {
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

// --- Public functions ---

export function requireApiKey(): string {
  const apiKey = process.env.SPIDER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing SPIDER_API_KEY');
  }
  return apiKey;
}

export function summarizeCrawlStats(
  pages: CrawlPage[],
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

async function postAndParse(
  endpoint: string,
  url: string,
  body: Record<string, unknown>,
): Promise<CrawlPage[]> {
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  const apiKey = requireApiKey();

  const response = await fetch(endpoint, {
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
    console.error('Spider non-JSON response:', responseText);
    throw new Error('Spider returned non-JSON body');
  }

  if (!response.ok) {
    console.error('Spider request failed:', response.status, parsed);
    throw new Error(`Spider request failed: ${response.status}`);
  }

  if (!Array.isArray(parsed)) {
    console.error('Unexpected Spider response shape:', parsed);
    throw new Error('Unexpected Spider response shape');
  }

  return parsed.map((entry) => normalizeCrawlPage(entry));
}

export async function scrape(
  url: string,
  options?: ScrapeOptions,
): Promise<CrawlPage[]> {
  const { waitFor } = options ?? {};

  const body: Record<string, unknown> = { url, request: REQUEST_MODE, return_format: RETURN_FORMAT, blacklist: BLACKLIST };
  if (waitFor !== undefined) body.wait_for = waitFor;

  return postAndParse(SCRAPE_ENDPOINT, url, body);
}

export async function crawl(
  url: string,
  options?: CrawlOptions,
): Promise<CrawlPage[]> {
  const { limit = 25, depth = 2, waitFor } = options ?? {};

  const body: Record<string, unknown> = { url, limit, depth, request: REQUEST_MODE, return_format: RETURN_FORMAT, blacklist: BLACKLIST };
  if (waitFor !== undefined) body.wait_for = waitFor;

  return postAndParse(CRAWL_ENDPOINT, url, body);
}

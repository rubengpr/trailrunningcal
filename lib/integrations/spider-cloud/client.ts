import { TimeoutError } from '@/lib/errors';
import { requireApiKey } from '@/lib/integrations/utils';

// --- Constants ---

const SCRAPE_ENDPOINT = 'https://api.spider.cloud/scrape';
const CRAWL_ENDPOINT = 'https://api.spider.cloud/crawl';

// --- Interfaces ---

export interface Costs {
  file_cost?: number;
  ai_cost?: number;
  compute_cost?: number;
  transform_cost?: number;
  total_cost?: number;
  bytes_transferred_cost?: number;
}

export interface Page {
  url: string;
  content: string;
  status: number;
  error: string | null;
  costs: Costs;
  // Falls back to join-markdown run time if Spider doesn't return a timestamp
  generatedAt?: string;
}

export interface Options {
  limit?: number;
  depth?: number;
  requestMode?: string;
  returnFormat?: string;
  blacklist?: readonly string[];
  respectRobots?: boolean;
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

function normalizePage(raw: unknown): Page {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid Spider crawl page item');
  }
  const record = raw as Record<string, unknown>;
  const costs =
    typeof record.costs === 'object' && record.costs !== null
      ? (record.costs as Costs)
      : {};
  const generatedAt = pickOptionalIsoTimestamp(record);
  const item: Page = {
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

async function postAndParse(
  endpoint: string,
  url: string,
  body: Record<string, unknown>,
): Promise<Page[]> {
  const apiKey = requireApiKey('SPIDER_API_KEY');

  let response: Response;
  let responseText: string;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    responseText = await response.text();
  } catch (err) {
    if (
      err != null &&
      typeof err === 'object' &&
      'name' in err &&
      (err.name === 'TimeoutError' || err.name === 'AbortError')
    ) {
      throw new TimeoutError('Spider Cloud');
    }
    throw err;
  }
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

  return parsed.map((entry) => normalizePage(entry));
}

export async function scrape(url: string, options?: Options): Promise<Page[]> {
  const {
    requestMode = 'smart',
    returnFormat = 'markdown',
    blacklist,
  } = options ?? {};
  const body: Record<string, unknown> = {
    url,
    request: requestMode,
    return_format: returnFormat,
    blacklist,
  };

  return postAndParse(SCRAPE_ENDPOINT, url, body);
}

export async function crawl(url: string, options?: Options): Promise<Page[]> {
  const {
    limit = 25,
    depth = 2,
    requestMode = 'smart',
    returnFormat = 'markdown',
    blacklist,
    respectRobots,
  } = options ?? {};
  const body: Record<string, unknown> = {
    url,
    limit,
    depth,
    request: requestMode,
    return_format: returnFormat,
    blacklist,
    respect_robots: respectRobots,
  };

  return postAndParse(CRAWL_ENDPOINT, url, body);
}

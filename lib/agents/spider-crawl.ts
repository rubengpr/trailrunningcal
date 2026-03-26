const SPIDER_CRAWL_ENDPOINT = 'https://api.spider.cloud/crawl';

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
   * Spider `request_timeout` (seconds, typically 5–255). Increase if you add long `wait_for` delays.
   */
  requestTimeout?: number;
}

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
    limit = 50,
    depth = 3,
    request = 'smart',
    returnFormat = 'markdown',
    waitFor,
    executionScripts,
    requestTimeout,
  } = options ?? {};

  const body: Record<string, unknown> = {
    url: seedUrl,
    limit,
    depth,
    request,
    return_format: returnFormat,
  };

  if (waitFor !== undefined) {
    body.wait_for = waitFor;
  }
  if (executionScripts !== undefined) {
    body.execution_scripts = executionScripts;
  }
  if (requestTimeout !== undefined) {
    body.request_timeout = requestTimeout;
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

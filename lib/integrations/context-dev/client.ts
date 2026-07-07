import { TimeoutError } from '@/lib/errors';
import { requireApiKey } from '@/lib/integrations/utils';

const CRAWL_ENDPOINT = 'https://api.context.dev/v1/web/crawl';

export interface ContextCrawlMetadata {
  numUrls?: number;
  numSucceeded?: number;
  numFailed?: number;
  numSkipped?: number;
}

export interface ContextCrawlResultMetadata {
  url?: string;
  sourceURL?: string;
  statusCode?: number;
  status?: number;
  success?: boolean;
  error?: string;
  generatedAt?: string;
  scrapedAt?: string;
}

export interface ContextCrawlResult {
  url?: string;
  markdown: string;
  metadata?: ContextCrawlResultMetadata;
}

export interface ContextCrawlResponse {
  results: ContextCrawlResult[];
  metadata: ContextCrawlMetadata;
}

interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  includeLinks?: boolean;
  includeImages?: boolean;
  useMainContentOnly?: boolean;
  timeoutMS?: number;
  stopAfterMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeMetadata(raw: unknown): ContextCrawlMetadata {
  if (!isRecord(raw)) return {};
  return {
    numUrls:
      typeof raw.numUrls === 'number' && Number.isFinite(raw.numUrls)
        ? raw.numUrls
        : undefined,
    numSucceeded:
      typeof raw.numSucceeded === 'number' && Number.isFinite(raw.numSucceeded)
        ? raw.numSucceeded
        : undefined,
    numFailed:
      typeof raw.numFailed === 'number' && Number.isFinite(raw.numFailed)
        ? raw.numFailed
        : undefined,
    numSkipped:
      typeof raw.numSkipped === 'number' && Number.isFinite(raw.numSkipped)
        ? raw.numSkipped
        : undefined,
  };
}

function normalizeResult(raw: unknown): ContextCrawlResult {
  if (!isRecord(raw)) {
    throw new Error('Invalid Context.dev crawl result item');
  }

  const metadata = isRecord(raw.metadata)
    ? (raw.metadata as ContextCrawlResultMetadata)
    : undefined;

  return {
    url: typeof raw.url === 'string' ? raw.url : undefined,
    markdown: String(raw.markdown ?? ''),
    metadata,
  };
}

function normalizeResponse(raw: unknown): ContextCrawlResponse {
  if (!isRecord(raw) || !Array.isArray(raw.results)) {
    throw new Error('Unexpected Context.dev response shape');
  }

  return {
    results: raw.results.map((entry) => normalizeResult(entry)),
    metadata: normalizeMetadata(raw.metadata),
  };
}

export async function crawl(
  url: string,
  options?: CrawlOptions,
): Promise<ContextCrawlResponse> {
  const apiKey = requireApiKey('CONTEXT_DEV_API_KEY');
  const body = {
    url,
    ...options,
  };

  let response: Response;
  let responseText: string;
  try {
    response = await fetch(CRAWL_ENDPOINT, {
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
      throw new TimeoutError('Context.dev');
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    console.error('Context.dev non-JSON response:', responseText);
    throw new Error('Context.dev returned non-JSON body');
  }

  if (!response.ok) {
    if (response.status === 408) {
      throw new TimeoutError('Context.dev');
    }
    console.error('Context.dev request failed:', response.status, parsed);
    throw new Error(`Context.dev request failed: ${response.status}`);
  }

  return normalizeResponse(parsed);
}

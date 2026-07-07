import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimeoutError } from '@/lib/errors';
import { crawl } from './client';

const ORIGINAL_API_KEY = process.env.CONTEXT_DEV_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.CONTEXT_DEV_API_KEY;
  } else {
    process.env.CONTEXT_DEV_API_KEY = ORIGINAL_API_KEY;
  }
});

describe('Context.dev client', () => {
  it('posts crawl options and parses the response', async () => {
    process.env.CONTEXT_DEV_API_KEY = 'ctx-key';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              markdown: '# Race',
              metadata: {
                url: 'https://example.com/',
                statusCode: 200,
                success: true,
              },
            },
          ],
          metadata: {
            numUrls: 1,
            numSucceeded: 1,
            numFailed: 0,
            numSkipped: 0,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await crawl('https://example.com', { maxPages: 25 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.context.dev/v1/web/crawl',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer ctx-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          url: 'https://example.com',
          maxPages: 25,
        }),
      }),
    );
    expect(result.metadata.numSucceeded).toBe(1);
    expect(result.results[0].markdown).toBe('# Race');
  });

  it('throws on malformed responses', async () => {
    process.env.CONTEXT_DEV_API_KEY = 'ctx-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      ),
    );

    await expect(crawl('https://example.com')).rejects.toThrow(
      'Unexpected Context.dev response shape',
    );
  });

  it('throws TimeoutError when the request aborts', async () => {
    process.env.CONTEXT_DEV_API_KEY = 'ctx-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')),
    );

    await expect(crawl('https://example.com')).rejects.toEqual(
      new TimeoutError('Context.dev'),
    );
  });

  it('throws TimeoutError when Context.dev returns HTTP 408', async () => {
    process.env.CONTEXT_DEV_API_KEY = 'ctx-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Request timeout',
            error_code: 'REQUEST_TIMEOUT',
          }),
          { status: 408 },
        ),
      ),
    );

    await expect(crawl('https://example.com')).rejects.toEqual(
      new TimeoutError('Context.dev'),
    );
  });
});

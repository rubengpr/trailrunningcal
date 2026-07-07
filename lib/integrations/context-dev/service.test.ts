import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  crawl: vi.fn(),
}));

vi.mock('@/lib/integrations/context-dev/client', () => ({
  crawl: mocks.crawl,
}));

import { crawlSite } from './service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Context.dev service', () => {
  it('returns merged markdown, page stats, and calculated cost', async () => {
    mocks.crawl.mockResolvedValue({
      results: [
        {
          markdown: '# Home\n\nRace details',
          metadata: {
            url: 'https://example.com/',
            statusCode: 200,
            success: true,
          },
        },
        {
          markdown: '# Registration',
          metadata: {
            url: 'https://example.com/register',
            statusCode: 200,
            success: true,
          },
        },
      ],
      metadata: {
        numUrls: 2,
        numSucceeded: 2,
        numFailed: 0,
        numSkipped: 0,
      },
    });

    const result = await crawlSite('https://example.com');

    expect(mocks.crawl).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        maxPages: 15,
        maxDepth: 2,
        includeLinks: true,
        includeImages: false,
        useMainContentOnly: false,
        timeoutMS: 30_000,
        stopAfterMs: 30_000,
      }),
    );
    expect(result.pageStats).toEqual({
      total: 2,
      successCount: 2,
      errorCount: 0,
    });
    expect(result.usage).toEqual({ totalCost: 0.05 });
    expect(result.markdown).toContain('seedUrl: "https://example.com"');
    expect(result.markdown).toContain('https://example.com/register');
    expect(result.markdown).toContain('# Registration');
  });

  it('counts failed page metadata as an error', async () => {
    mocks.crawl.mockResolvedValue({
      results: [
        {
          markdown: '',
          metadata: {
            url: 'https://example.com/error',
            statusCode: 500,
            success: false,
            error: 'server error',
          },
        },
      ],
      metadata: {
        numUrls: 1,
        numSucceeded: 0,
        numFailed: 1,
        numSkipped: 0,
      },
    });

    const result = await crawlSite('https://example.com');

    expect(result.pageStats).toEqual({
      total: 1,
      successCount: 0,
      errorCount: 1,
    });
    expect(result.usage).toEqual({ totalCost: 0 });
    expect(result.markdown).toContain('**Status:** 500');
    expect(result.markdown).toContain('**Error:** server error');
  });

  it('filters social share pages from merged output and page stats', async () => {
    mocks.crawl.mockResolvedValue({
      results: [
        {
          markdown: '# Race',
          metadata: {
            url: 'https://example.com/',
            statusCode: 200,
            success: true,
          },
        },
        {
          markdown: '# Share',
          metadata: {
            url: 'https://x.com/intent/tweet?url=https%3A%2F%2Fexample.com',
            statusCode: 200,
            success: true,
          },
        },
      ],
      metadata: {
        numUrls: 2,
        numSucceeded: 2,
        numFailed: 0,
        numSkipped: 0,
      },
    });

    const result = await crawlSite('https://example.com');

    expect(result.pageStats).toEqual({
      total: 1,
      successCount: 1,
      errorCount: 0,
    });
    expect(result.markdown).not.toContain('x.com/intent/tweet');
    expect(result.usage).toEqual({ totalCost: 0.05 });
  });
});

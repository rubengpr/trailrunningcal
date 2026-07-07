import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimeoutError } from '@/lib/errors';
import type { CrawlResult } from '@/lib/services/crawl';

const mocks = vi.hoisted(() => ({
  crawlWithSpider: vi.fn(),
  crawlWithContextDev: vi.fn(),
}));

vi.mock('@/lib/integrations/spider-cloud/service', () => ({
  crawlSite: mocks.crawlWithSpider,
}));

vi.mock('@/lib/integrations/context-dev/service', () => ({
  crawlSite: mocks.crawlWithContextDev,
}));

import { crawlSite } from './crawl';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function result(overrides: Partial<CrawlResult> = {}): CrawlResult {
  return {
    markdown: 'Long crawl markdown. '.repeat(80),
    pageStats: {
      total: 1,
      successCount: 1,
      errorCount: 0,
    },
    usage: {
      totalCost: 0.01,
    },
    fallbackUsed: false,
    ...overrides,
  };
}

describe('crawl service fallback orchestration', () => {
  it('returns Spider result when it is usable', async () => {
    mocks.crawlWithSpider.mockResolvedValue(result());

    const crawl = await crawlSite('https://example.com');

    expect(mocks.crawlWithSpider).toHaveBeenCalledWith('https://example.com');
    expect(mocks.crawlWithContextDev).not.toHaveBeenCalled();
    expect(crawl.fallbackUsed).toBe(false);
  });

  it('falls back when Spider throws', async () => {
    mocks.crawlWithSpider.mockRejectedValue(new Error('Spider failed'));
    mocks.crawlWithContextDev.mockResolvedValue(result({ markdown: 'Context' }));

    const crawl = await crawlSite('https://example.com');

    expect(mocks.crawlWithContextDev).toHaveBeenCalledWith(
      'https://example.com',
    );
    expect(crawl.fallbackUsed).toBe(true);
    expect(crawl.markdown).toBe('Context');
  });

  it('falls back when Spider times out', async () => {
    mocks.crawlWithSpider.mockRejectedValue(new TimeoutError('Spider Cloud'));
    mocks.crawlWithContextDev.mockResolvedValue(result({ markdown: 'Context' }));

    const crawl = await crawlSite('https://example.com');

    expect(mocks.crawlWithContextDev).toHaveBeenCalledWith(
      'https://example.com',
    );
    expect(crawl.fallbackUsed).toBe(true);
  });

  it('falls back when Spider has no successful pages', async () => {
    mocks.crawlWithSpider.mockResolvedValue(
      result({
        pageStats: {
          total: 1,
          successCount: 0,
          errorCount: 1,
        },
      }),
    );
    mocks.crawlWithContextDev.mockResolvedValue(result({ markdown: 'Context' }));

    const crawl = await crawlSite('https://example.com');

    expect(mocks.crawlWithContextDev).toHaveBeenCalledWith(
      'https://example.com',
    );
    expect(crawl.fallbackUsed).toBe(true);
  });

  it('falls back when Spider markdown is too short', async () => {
    mocks.crawlWithSpider.mockResolvedValue(result({ markdown: 'short' }));
    mocks.crawlWithContextDev.mockResolvedValue(result({ markdown: 'Context' }));

    const crawl = await crawlSite('https://example.com');

    expect(mocks.crawlWithContextDev).toHaveBeenCalledWith(
      'https://example.com',
    );
    expect(crawl.fallbackUsed).toBe(true);
  });

  it('surfaces Context.dev errors after Spider failure', async () => {
    mocks.crawlWithSpider.mockRejectedValue(new Error('Spider failed'));
    mocks.crawlWithContextDev.mockRejectedValue(new Error('Context failed'));

    await expect(crawlSite('https://example.com')).rejects.toThrow(
      'Context failed',
    );
  });
});

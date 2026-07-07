import { describe, expect, it, vi } from 'vitest';

import type { Page } from './client';

const mocks = vi.hoisted(() => ({
  scrape: vi.fn(),
  crawl: vi.fn(),
}));

vi.mock('@/lib/integrations/spider-cloud/client', () => ({
  scrape: mocks.scrape,
  crawl: mocks.crawl,
}));

import { crawlSite, scrapePage } from './service';

function page(overrides: Partial<Page>): Page {
  return {
    url: 'https://example.com/',
    content: '# Race page',
    status: 200,
    error: null,
    costs: {},
    ...overrides,
  };
}

describe('spider service result filtering', () => {
  const validPage = page({
    url: 'https://caminsdefusta.wordpress.com/contacte/',
    content: '# Contacte',
  });

  const sharePages = [
    page({
      url: 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcaminsdefusta.wordpress.com%2F',
      content: '# Facebook share',
    }),
    page({
      url: 'https://x.com/intent/tweet?text=Contacte&url=https%3A%2F%2Fcaminsdefusta.wordpress.com%2Fcontacte%2F',
      content: '# X share',
    }),
    page({
      url: 'https://twitter.com/intent/tweet?text=Contacte&url=https%3A%2F%2Fcaminsdefusta.wordpress.com%2Fcontacte%2F',
      content: '# Twitter share',
    }),
  ];

  it('removes social share pages before merging scrape results', async () => {
    mocks.scrape.mockResolvedValue([validPage, ...sharePages]);

    const result = await scrapePage('https://caminsdefusta.wordpress.com');

    expect(result.pageStats).toEqual({
      total: 1,
      successCount: 1,
      errorCount: 0,
    });
    expect(result.markdown).toContain('https://caminsdefusta.wordpress.com/contacte/');
    expect(result.markdown).not.toContain('facebook.com/sharer');
    expect(result.markdown).not.toContain('x.com/intent/tweet');
    expect(result.markdown).not.toContain('twitter.com/intent/tweet');
  });

  it('removes social share pages before merging crawl results', async () => {
    mocks.crawl.mockResolvedValue([validPage, ...sharePages]);

    const result = await crawlSite('https://caminsdefusta.wordpress.com');

    expect(mocks.crawl).toHaveBeenCalledWith(
      'https://caminsdefusta.wordpress.com',
      expect.objectContaining({ respectRobots: false }),
    );
    expect(result.pageStats).toEqual({
      total: 1,
      successCount: 1,
      errorCount: 0,
    });
    expect(result.markdown).toContain('https://caminsdefusta.wordpress.com/contacte/');
    expect(result.markdown).not.toContain('facebook.com/sharer');
    expect(result.markdown).not.toContain('x.com/intent/tweet');
    expect(result.markdown).not.toContain('twitter.com/intent/tweet');
  });

  it('aggregates costs only from retained pages', async () => {
    mocks.scrape.mockResolvedValue([
      page({
        url: 'https://caminsdefusta.wordpress.com/contacte/',
        costs: {
          compute_cost: 0.1,
          transform_cost: 0.2,
          total_cost: 0.3,
        },
      }),
      page({
        url: 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcaminsdefusta.wordpress.com%2F',
        costs: {
          compute_cost: 10,
          transform_cost: 20,
          total_cost: 30,
        },
      }),
    ]);

    const result = await scrapePage('https://caminsdefusta.wordpress.com');

    expect(result.usage).toEqual({
      totalCost: 0.3,
    });
  });
});

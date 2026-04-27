import { describe, expect, it } from 'vitest';

import type { CrawlPage } from './client';
import {
  dedupeSpiderPages,
  mergePages,
  normalizeSpiderCrawlUrl,
  sortSpiderPagesForJoin,
} from './join-markdown';

function page(overrides: Partial<CrawlPage>): CrawlPage {
  return {
    url: 'https://example.com/',
    content: 'body',
    status: 200,
    error: null,
    costs: {},
    ...overrides,
  };
}

describe('normalizeSpiderCrawlUrl', () => {
  it('collapses meaningless query ?& with same path as bare URL', () => {
    const withNoise = normalizeSpiderCrawlUrl('https://Trail.example.com/?&');
    const clean = normalizeSpiderCrawlUrl('https://trail.example.com/');
    expect(withNoise).toBe(clean);
  });

  it('drops trailing slash on non-root paths for dedupe key', () => {
    const a = normalizeSpiderCrawlUrl('https://example.com/foo/');
    const b = normalizeSpiderCrawlUrl('https://example.com/foo');
    expect(a).toBe(b);
  });
});

describe('dedupeSpiderPages', () => {
  it('keeps one item when URLs normalize the same', () => {
    const pages = [
      page({ url: 'https://x.com/?&', content: 'short' }),
      page({ url: 'https://x.com/', content: 'longer body here' }),
    ];
    const result = dedupeSpiderPages(pages);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('longer body here');
  });

  it('prefers status 200 over non-200 when lengths tie', () => {
    const pages = [
      page({ url: 'https://x.com/', content: 'same', status: 500 }),
      page({ url: 'https://x.com/?&', content: 'same', status: 200 }),
    ];
    const result = dedupeSpiderPages(pages);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(200);
  });
});

describe('sortSpiderPagesForJoin', () => {
  const fallbackIso = '2026-01-15T12:00:00.000Z';

  it('when effective generatedAt ties, places seed URL first then sorts by normalized URL', () => {
    const seed = 'https://z.com/';
    const pages = [
      page({ url: 'https://a.com/', content: 'a' }),
      page({ url: 'https://z.com/?&', content: 'z' }),
      page({ url: 'https://m.com/', content: 'm' }),
    ];
    const sorted = sortSpiderPagesForJoin(seed, pages, fallbackIso);
    expect(sorted.map((p) => p.url)).toEqual([
      'https://z.com/?&',
      'https://a.com/',
      'https://m.com/',
    ]);
  });

  it('sorts by ascending effective generatedAt, then seed, then URL', () => {
    const seed = 'https://z.com/';
    const pages = [
      page({
        url: 'https://a.com/',
        content: 'a',
        generatedAt: '2026-03-01T00:00:00.000Z',
      }),
      page({
        url: 'https://z.com/',
        content: 'z',
        generatedAt: '2026-02-01T00:00:00.000Z',
      }),
      page({
        url: 'https://m.com/',
        content: 'm',
        generatedAt: '2026-02-01T00:00:00.000Z',
      }),
    ];
    const sorted = sortSpiderPagesForJoin(seed, pages, '2026-01-01T00:00:00.000Z');
    expect(sorted.map((p) => p.url)).toEqual([
      'https://z.com/',
      'https://m.com/',
      'https://a.com/',
    ]);
  });
});

describe('mergePages', () => {
  it('includes front matter, seed section first, and each source body', () => {
    const seedUrl = 'https://a.com/';
    const pages = [
      page({ url: 'https://b.com/', content: '# Beta' }),
      page({ url: 'https://a.com/', content: '# Alpha' }),
    ];
    const generatedAt = new Date('2026-01-15T12:00:00.000Z');
    const markdown = mergePages(seedUrl, pages, {
      generatedAt,
    });
    expect(markdown.startsWith('---\n')).toBe(true);
    expect(markdown).toContain('seedUrl: "https://a.com/"');
    expect(markdown).toContain('generatedAt: "2026-01-15T12:00:00.000Z"');
    expect(markdown).toContain('sources:');
    expect(markdown).toContain(
      '    generatedAt: "2026-01-15T12:00:00.000Z"',
    );
    expect(markdown).toContain('## Source');
    const alphaIndex = markdown.indexOf('# Alpha');
    const betaIndex = markdown.indexOf('# Beta');
    expect(alphaIndex).toBeGreaterThan(-1);
    expect(betaIndex).toBeGreaterThan(-1);
    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(markdown).toContain('\n---\n');
  });

  it('adds status and error lines when crawl failed', () => {
    const seedUrl = 'https://a.com/';
    const pages = [
      page({
        url: 'https://a.com/',
        content: '',
        status: 500,
        error: 'timeout',
      }),
    ];
    const markdown = mergePages(seedUrl, pages, {
      generatedAt: new Date('2026-01-15T12:00:00.000Z'),
    });
    expect(markdown).toContain('**Status:** 500');
    expect(markdown).toContain('**Error:** timeout');
  });

  it('uses per-page generatedAt in sources when provided', () => {
    const seedUrl = 'https://a.com/';
    const pages = [
      page({
        url: 'https://a.com/',
        content: '# A',
        generatedAt: '2026-02-01T00:00:00.000Z',
      }),
      page({ url: 'https://b.com/', content: '# B' }),
    ];
    const markdown = mergePages(seedUrl, pages, {
      generatedAt: new Date('2026-01-15T12:00:00.000Z'),
    });
    expect(markdown).toMatch(
      /- url: "https:\/\/a\.com\/"\s*\n\s*generatedAt: "2026-02-01T00:00:00\.000Z"/,
    );
    expect(markdown).toMatch(
      /- url: "https:\/\/b\.com\/"\s*\n\s*generatedAt: "2026-01-15T12:00:00\.000Z"/,
    );
    const betaIndex = markdown.indexOf('# B');
    const alphaIndex = markdown.indexOf('# A');
    expect(betaIndex).toBeLessThan(alphaIndex);
  });
});

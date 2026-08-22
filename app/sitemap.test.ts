import { describe, expect, it, vi } from 'vitest';
import { BASE_URL } from '@/lib/config';
import sitemap from './sitemap';

vi.mock('@/lib/db/races', () => ({
  getRaces: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db/sitemap-events', () => ({
  getSitemapEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/content/blog-utils', () => ({
  getAllBlogPosts: vi.fn().mockReturnValue([]),
}));

describe('sitemap race type URLs', () => {
  it('includes canonical /t race type URLs', async () => {
    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).toContain(`${BASE_URL}/es/t/ultra-trail`);
    expect(sitemapUrls).toContain(`${BASE_URL}/ca/t/ultra-trail`);
  });

  it('does not include legacy root race type URLs', async () => {
    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).not.toContain(`${BASE_URL}/es/ultra-trail`);
    expect(sitemapUrls).not.toContain(`${BASE_URL}/ca/ultra-trail`);
  });
});

describe('sitemap destination URLs', () => {
  it('includes parallel /d destination URLs', async () => {
    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).toContain(`${BASE_URL}/es/d/cataluna/barcelona`);
    expect(sitemapUrls).toContain(`${BASE_URL}/ca/d/cataluna/barcelona`);
    expect(sitemapUrls).toContain(`${BASE_URL}/es/d/comunidad-valenciana/alicante`);
    expect(sitemapUrls).toContain(`${BASE_URL}/ca/d/comunidad-valenciana/castellon`);
    expect(sitemapUrls).toContain(`${BASE_URL}/es/d/comunidad-valenciana/valencia`);
  });

  it('does not include legacy /provincia URLs', async () => {
    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).not.toContain(`${BASE_URL}/es/provincia/barcelona`);
    expect(sitemapUrls).not.toContain(`${BASE_URL}/ca/provincia/barcelona`);
  });
});

describe('sitemap event URLs', () => {
  it('includes canonical /e event URLs', async () => {
    const { getSitemapEvents } = await import('@/lib/db/sitemap-events');
    vi.mocked(getSitemapEvents).mockResolvedValueOnce([
      {
        slug: 'cursa-cassoles-de-tros',
        updatedAt: '2026-08-08T10:00:00.000Z',
      },
    ]);

    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).toContain(`${BASE_URL}/es/e/cursa-cassoles-de-tros`);
    expect(sitemapUrls).toContain(`${BASE_URL}/ca/e/cursa-cassoles-de-tros`);
    expect(urls.find(
      (entry) => entry.url === `${BASE_URL}/es/e/cursa-cassoles-de-tros`,
    )?.lastModified).toBe('2026-08-08T10:00:00.000Z');
  });

  it('does not include legacy /carrera URLs', async () => {
    const { getSitemapEvents } = await import('@/lib/db/sitemap-events');
    vi.mocked(getSitemapEvents).mockResolvedValueOnce([
      {
        slug: 'cursa-cassoles-de-tros',
        updatedAt: null,
      },
    ]);

    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).not.toContain(`${BASE_URL}/es/carrera/cursa-cassoles-de-tros-10k`);
    expect(sitemapUrls).not.toContain(`${BASE_URL}/ca/carrera/cursa-cassoles-de-tros-10k`);
  });
});

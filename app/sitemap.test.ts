import { describe, expect, it, vi } from 'vitest';
import { BASE_URL } from '@/lib/config';
import sitemap from './sitemap';

vi.mock('@/lib/db/races', () => ({
  getRaces: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db/events', () => ({
  getEvents: vi.fn().mockResolvedValue([]),
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
    const { getEvents } = await import('@/lib/db/events');
    vi.mocked(getEvents).mockResolvedValueOnce([
      {
        event: {
          id: 'event-1',
          name: 'Cursa Cassoles de Tros',
          slug: 'cursa-cassoles-de-tros',
          websiteUrl: null,
          organizerId: null,
          description: null,
          heroImageFilename: null,
          updatedAt: null,
        },
        races: [],
        allRaceCount: 0,
        dateRange: { startDate: null, endDate: null },
        location: { city: null, province: null, groups: [], isMultipleLocations: false },
      },
    ]);

    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).toContain(`${BASE_URL}/es/e/cursa-cassoles-de-tros`);
    expect(sitemapUrls).toContain(`${BASE_URL}/ca/e/cursa-cassoles-de-tros`);
  });

  it('does not include legacy /carrera URLs', async () => {
    const { getEvents } = await import('@/lib/db/events');
    vi.mocked(getEvents).mockResolvedValueOnce([
      {
        event: {
          id: 'event-1',
          name: 'Cursa Cassoles de Tros',
          slug: 'cursa-cassoles-de-tros',
          websiteUrl: null,
          organizerId: null,
          description: null,
          heroImageFilename: null,
          updatedAt: null,
        },
        races: [],
        allRaceCount: 0,
        dateRange: { startDate: null, endDate: null },
        location: { city: null, province: null, groups: [], isMultipleLocations: false },
      },
    ]);

    const urls = await sitemap();
    const sitemapUrls = urls.map((entry) => entry.url);

    expect(sitemapUrls).not.toContain(`${BASE_URL}/es/carrera/cursa-cassoles-de-tros-10k`);
    expect(sitemapUrls).not.toContain(`${BASE_URL}/ca/carrera/cursa-cassoles-de-tros-10k`);
  });
});

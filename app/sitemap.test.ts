import { describe, expect, it, vi } from 'vitest';
import { BASE_URL } from '@/lib/config';
import sitemap from './sitemap';

vi.mock('@/lib/db/races', () => ({
  getRaces: vi.fn().mockResolvedValue([]),
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

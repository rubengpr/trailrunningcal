import { normalizeUrl } from '@/lib/validation';
import { scrape, crawl } from '@/lib/integrations/spider-cloud/client';
import type { Page } from '@/lib/integrations/spider-cloud/client';

const BLACKLIST: readonly string[] = [
  // Media & gallery
  'galeria',
  'gallery',
  'foto',
  'photo',
  'video',
  'imatge',
  'imagen',
  'album',
  // Past results & rankings
  'classificaci',
  'clasificacion',
  'resultats',
  'resultados',
  'results',
  'premis',
  'podis',
  // Past editions (year-based)
  'edicions-anteriors',
  'edicio-20',
  'edicion-20',
  '2010',
  '2011',
  '2012',
  '2013',
  '2014',
  '2015',
  '2016',
  '2017',
  '2018',
  '2019',
  '2020',
  '2021',
  '2022',
  '2023',
  '2024',
  // Legal & privacy
  'legal',
  'privacy',
  'privacidad',
  'privacitat',
  'cookies',
  'policy',
  'politica',
  // Shop & products
  'botiga',
  'tienda',
  'product-page',
  // Social sharing
  'xarxes',
  'sharer',
  'intent',
  // Accommodation
  'allotjaments',
  'alojamientos',
  // Kids races
  'kids',
  'infantil',
  'correxics',
  // Portfolio (unrelated website sections)
  'portfolio',
  // News & comments
  'noticies',
  'noticias',
  'news',
  'comentarios',
  'comentaris',
  // Platform / technical artifacts
  'ad_campaign',
  'settings',
  'elementor',
  'allactivity',
  '\\/help\\/',
  'pages\\/create',
  'rss',
];

/** Per-page HTTP outcome after Spider crawl; success + error === total always. */
export interface PageStats {
  total: number;
  successCount: number;
  errorCount: number;
}

export function summarizeCrawlStats(pages: Page[]): PageStats {
  const total = pages.length;
  let successCount = 0;
  for (const page of pages) {
    if (page.status >= 200 && page.status < 300) {
      successCount += 1;
    }
  }
  const errorCount = total - successCount;
  return { total, successCount, errorCount };
}
import { mergePages } from '@/lib/integrations/spider-cloud/join-markdown';

export interface SpiderServiceResult {
  markdown: string;
  crawlPageStats: PageStats;
}

export async function scrapePage(urlStr: string): Promise<SpiderServiceResult> {
  const normalizedUrl = normalizeUrl(urlStr);
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('INVALID_URL');
  }
  const pages = await scrape(normalizedUrl, { blacklist: BLACKLIST });
  const crawlPageStats = summarizeCrawlStats(pages);
  const markdown = mergePages(normalizedUrl, pages);
  return { markdown, crawlPageStats };
}

export async function crawlSite(urlStr: string): Promise<SpiderServiceResult> {
  const normalizedUrl = normalizeUrl(urlStr);
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('INVALID_URL');
  }
  const pages = await crawl(normalizedUrl, { blacklist: BLACKLIST });
  const crawlPageStats = summarizeCrawlStats(pages);
  const markdown = mergePages(normalizedUrl, pages);
  return { markdown, crawlPageStats };
}

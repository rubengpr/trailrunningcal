import { scrape, crawl } from '@/lib/integrations/spider-cloud/client';
import type { Page } from '@/lib/integrations/spider-cloud/client';
import { mergePages } from '@/lib/integrations/spider-cloud/join-markdown';
import type { PageStats } from '@/types/races-scrape-api.types';

export interface SpiderServiceResult {
  markdown: string;
  pageStats: PageStats;
}

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
  'feed',
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
  'facebook\\.com\\/sharer',
  'x\\.com\\/intent\\/tweet',
  'twitter\\.com\\/intent\\/tweet',
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

const EXCLUDED_RESULT_URL_PATTERNS: readonly RegExp[] = [
  /facebook\.com\/sharer/i,
  /x\.com\/intent\/tweet/i,
  /twitter\.com\/intent\/tweet/i,
];

function filterExcludedResultPages(pages: Page[]): Page[] {
  return pages.filter(
    (page) =>
      !EXCLUDED_RESULT_URL_PATTERNS.some((pattern) => pattern.test(page.url)),
  );
}

function summarizeStats(pages: Page[]): PageStats {
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

export async function scrapePage(url: string): Promise<SpiderServiceResult> {
  const pages = await scrape(url, { blacklist: BLACKLIST });
  const filteredPages = filterExcludedResultPages(pages);
  const pageStats = summarizeStats(filteredPages);
  const markdown = mergePages(url, filteredPages);
  return { markdown, pageStats };
}

export async function crawlSite(url: string): Promise<SpiderServiceResult> {
  const pages = await crawl(url, { blacklist: BLACKLIST });
  const filteredPages = filterExcludedResultPages(pages);
  const pageStats = summarizeStats(filteredPages);
  const markdown = mergePages(url, filteredPages);
  return { markdown, pageStats };
}

import { scrape, crawl } from '@/lib/integrations/spider-cloud/client';
import type { Page } from '@/lib/integrations/spider-cloud/client';
import { filterExcludedResultPages } from '@/lib/crawl/filters';
import { mergePages } from '@/lib/integrations/spider-cloud/join-markdown';
import type { PageStats, ScrapeUsage } from '@/types/races-scrape-api.types';

export interface SpiderServiceResult {
  markdown: string;
  pageStats: PageStats;
  usage: ScrapeUsage;
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
  'facebook.com/sharer',
  'x.com/intent/tweet',
  'twitter.com/intent/tweet',
  // Accommodation
  'allotjaments',
  'alojamientos',
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

function sumCost(
  pages: Page[],
  key: keyof Page['costs'],
): number | null {
  let sum = 0;
  let found = false;

  for (const page of pages) {
    const value = page.costs[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }
    sum += value;
    found = true;
  }

  return found ? sum : null;
}

function summarizeUsage(pages: Page[]): ScrapeUsage {
  return {
    totalCost: sumCost(pages, 'total_cost'),
  };
}

export async function scrapePage(url: string): Promise<SpiderServiceResult> {
  const pages = await scrape(url, { blacklist: BLACKLIST });
  const filteredPages = filterExcludedResultPages(pages);
  const pageStats = summarizeStats(filteredPages);
  const usage = summarizeUsage(filteredPages);
  const markdown = mergePages(url, filteredPages);
  return { markdown, pageStats, usage };
}

export async function crawlSite(url: string): Promise<SpiderServiceResult> {
  const pages = await crawl(url, {
    blacklist: BLACKLIST,
    respectRobots: false,
  });
  const filteredPages = filterExcludedResultPages(pages);
  const pageStats = summarizeStats(filteredPages);
  const usage = summarizeUsage(filteredPages);
  const markdown = mergePages(url, filteredPages);
  return { markdown, pageStats, usage };
}

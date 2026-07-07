import type { CrawlPage } from '@/lib/crawl/merge-markdown';

const EXCLUDED_RESULT_URL_PATTERNS: readonly RegExp[] = [
  /facebook\.com\/sharer/i,
  /x\.com\/intent\/tweet/i,
  /twitter\.com\/intent\/tweet/i,
];

export function filterExcludedResultPages<T extends CrawlPage>(pages: T[]): T[] {
  return pages.filter(
    (page) =>
      !EXCLUDED_RESULT_URL_PATTERNS.some((pattern) => pattern.test(page.url)),
  );
}

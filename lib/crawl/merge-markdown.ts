export interface CrawlPage {
  url: string;
  content: string;
  status: number;
  error: string | null;
  generatedAt?: string;
}

function stripMeaninglessSearch(url: URL): void {
  const inner = url.search.replace(/^\?/, '');
  if (inner === '' || /^&+$/.test(inner)) {
    url.search = '';
  }
}

/**
 * Stable key for deduping crawl URLs (hash stripped, host lowercased, empty query removed, trailing slash dropped except root).
 */
export function normalizeCrawlUrl(urlString: string): string {
  const url = new URL(urlString);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  stripMeaninglessSearch(url);
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.href;
}

function pickBetterPage<T extends CrawlPage>(
  existing: T,
  candidate: T,
): T {
  const existingOk = existing.status === 200;
  const candidateOk = candidate.status === 200;
  if (existingOk !== candidateOk) {
    return candidateOk ? candidate : existing;
  }
  if (existing.content.length !== candidate.content.length) {
    return existing.content.length >= candidate.content.length
      ? existing
      : candidate;
  }
  return existing;
}

export function dedupePages<T extends CrawlPage>(
  pages: T[],
): T[] {
  const byNormalized = new Map<string, T>();
  for (const page of pages) {
    const key = normalizeCrawlUrl(page.url);
    const current = byNormalized.get(key);
    if (!current) {
      byNormalized.set(key, page);
      continue;
    }
    byNormalized.set(key, pickBetterPage(current, page));
  }
  return [...byNormalized.values()];
}

function resolveGeneratedAt(
  item: CrawlPage,
  fallbackGeneratedAtIso: string,
): string {
  return item.generatedAt ?? fallbackGeneratedAtIso;
}

function parseGeneratedAtMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/**
 * Orders pages by ascending effective `generatedAt` (per-item or fallback), then seed URL,
 * then normalized URL for stable ties.
 */
export function sortPages<T extends CrawlPage>(
  seedUrl: string,
  pages: T[],
  fallbackGeneratedAtIso: string,
): T[] {
  const normalizedSeedUrl = normalizeCrawlUrl(seedUrl);
  return [...pages].sort((a, b) => {
    const timestampA = parseGeneratedAtMs(
      resolveGeneratedAt(a, fallbackGeneratedAtIso),
    );
    const timestampB = parseGeneratedAtMs(
      resolveGeneratedAt(b, fallbackGeneratedAtIso),
    );
    if (timestampA !== timestampB) {
      return timestampA - timestampB;
    }
    const normalizedUrlA = normalizeCrawlUrl(a.url);
    const normalizedUrlB = normalizeCrawlUrl(b.url);
    const aIsSeed = normalizedUrlA === normalizedSeedUrl;
    const bIsSeed = normalizedUrlB === normalizedSeedUrl;
    if (aIsSeed !== bIsSeed) {
      return aIsSeed ? -1 : 1;
    }
    return normalizedUrlA.localeCompare(normalizedUrlB);
  });
}

function escapeString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontMatter(
  seedUrl: string,
  generatedAtIso: string,
  pages: CrawlPage[],
): string {
  const lines: string[] = [
    '---',
    `seedUrl: ${escapeString(seedUrl)}`,
    `generatedAt: ${escapeString(generatedAtIso)}`,
    'sources:',
  ];
  for (const item of pages) {
    const sourceGeneratedAt = item.generatedAt ?? generatedAtIso;
    lines.push(`  - url: ${escapeString(item.url)}`);
    lines.push(`    generatedAt: ${escapeString(sourceGeneratedAt)}`);
    lines.push(`    status: ${item.status}`);
    lines.push(
      `    error: ${item.error === null ? 'null' : escapeString(item.error)}`,
    );
  }
  lines.push('---', '');
  return lines.join('\n');
}

function buildSourceSection(page: CrawlPage): string {
  const metaLines: string[] = ['## Source', '', `**URL:** ${page.url}`];
  if (page.status !== 200) {
    metaLines.push(`**Status:** ${page.status}`);
  }
  if (page.error !== null && page.error !== '') {
    metaLines.push(`**Error:** ${page.error}`);
  }
  metaLines.push('', page.content);
  return metaLines.join('\n');
}

/**
 * Merge crawl page markdown into one document with YAML front matter and per-source sections.
 */
export function mergePages<T extends CrawlPage>(
  seedUrl: string,
  pages: T[],
): string {
  const generatedAt = new Date();
  const generatedAtIso = generatedAt.toISOString();
  const sortedPages = sortPages(
    seedUrl,
    dedupePages(pages),
    generatedAtIso,
  );
  const frontMatter = buildFrontMatter(seedUrl, generatedAtIso, sortedPages);
  const sections = sortedPages.map((page) => buildSourceSection(page));
  const body = sections.join('\n\n---\n\n');
  return `${frontMatter}${body}\n`;
}

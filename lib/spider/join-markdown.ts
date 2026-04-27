import type { SpiderCrawlPageItem } from './client';

export interface JoinSpiderCrawlMarkdownOptions {
  generatedAt?: Date;
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
export function normalizeSpiderCrawlUrl(urlString: string): string {
  const url = new URL(urlString);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  stripMeaninglessSearch(url);
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.href;
}

function pickBetterPage(
  existing: SpiderCrawlPageItem,
  candidate: SpiderCrawlPageItem,
): SpiderCrawlPageItem {
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

export function dedupeSpiderPages(
  pages: SpiderCrawlPageItem[],
): SpiderCrawlPageItem[] {
  const byNormalized = new Map<string, SpiderCrawlPageItem>();
  for (const page of pages) {
    const key = normalizeSpiderCrawlUrl(page.url);
    const current = byNormalized.get(key);
    if (!current) {
      byNormalized.set(key, page);
      continue;
    }
    byNormalized.set(key, pickBetterPage(current, page));
  }
  return [...byNormalized.values()];
}

function effectiveSourceGeneratedAtIso(
  item: SpiderCrawlPageItem,
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
export function sortSpiderPagesForJoin(
  seedUrl: string,
  pages: SpiderCrawlPageItem[],
  fallbackGeneratedAtIso: string,
): SpiderCrawlPageItem[] {
  const seedNorm = normalizeSpiderCrawlUrl(seedUrl);
  return [...pages].sort((a, b) => {
    const timeA = parseGeneratedAtMs(
      effectiveSourceGeneratedAtIso(a, fallbackGeneratedAtIso),
    );
    const timeB = parseGeneratedAtMs(
      effectiveSourceGeneratedAtIso(b, fallbackGeneratedAtIso),
    );
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    const normA = normalizeSpiderCrawlUrl(a.url);
    const normB = normalizeSpiderCrawlUrl(b.url);
    const aIsSeed = normA === seedNorm;
    const bIsSeed = normB === seedNorm;
    if (aIsSeed !== bIsSeed) {
      return aIsSeed ? -1 : 1;
    }
    return normA.localeCompare(normB);
  });
}

function escapeYamlDoubleQuoted(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildYamlFrontMatter(
  seedUrl: string,
  generatedAtIso: string,
  prepared: SpiderCrawlPageItem[],
): string {
  const lines: string[] = [
    '---',
    `seedUrl: ${escapeYamlDoubleQuoted(seedUrl)}`,
    `generatedAt: ${escapeYamlDoubleQuoted(generatedAtIso)}`,
    'sources:',
  ];
  for (const item of prepared) {
    const sourceGeneratedAt = item.generatedAt ?? generatedAtIso;
    lines.push(`  - url: ${escapeYamlDoubleQuoted(item.url)}`);
    lines.push(`    generatedAt: ${escapeYamlDoubleQuoted(sourceGeneratedAt)}`);
    lines.push(`    status: ${item.status}`);
    lines.push(
      `    error: ${item.error === null ? 'null' : escapeYamlDoubleQuoted(item.error)}`,
    );
  }
  lines.push('---', '');
  return lines.join('\n');
}

function buildSourceSection(page: SpiderCrawlPageItem): string {
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
export function joinSpiderCrawlPagesToMarkdown(
  seedUrl: string,
  pages: SpiderCrawlPageItem[],
  options?: JoinSpiderCrawlMarkdownOptions,
): string {
  const generatedAt = options?.generatedAt ?? new Date();
  const generatedAtIso = generatedAt.toISOString();
  const prepared = sortSpiderPagesForJoin(
    seedUrl,
    dedupeSpiderPages(pages),
    generatedAtIso,
  );
  const front = buildYamlFrontMatter(seedUrl, generatedAtIso, prepared);
  const sections = prepared.map((page) => buildSourceSection(page));
  const body = sections.join('\n\n---\n\n');
  return `${front}${body}\n`;
}

import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import type {
  Charge,
  Event,
  Job,
  Provider,
  Source,
} from '@/types/web-search-benchmark.types';
import { settings } from '@/lib/web-search-benchmark/config';

export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
export function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
export function publicUrl(value: string): string {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !host.includes('.') ||
    host.endsWith('.local') ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    isIP(host) ||
    host === 'localhost'
  )
    throw new Error('URL must identify a public website');
  return url.href;
}
export function normalize(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources
    .filter((source) => {
      try {
        source.url = publicUrl(source.url);
      } catch {
        return false;
      }
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, settings.maxResults)
    .map((source) => ({
      ...source,
      content: source.content.slice(0, settings.maxContentCharacters),
    }));
}
export function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function identifier(value: string): string {
  const digest = hash(value);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}
export function plan(
  rowIds: string[],
  selected: Provider[],
  trials: number,
  seed: number,
  runId: string,
): Job[] {
  const jobs = selected.flatMap((provider) =>
    rowIds.flatMap((rowId) =>
      Array.from({ length: trials }, (_, i) => {
        const id = identifier(`${runId}:${provider}:${rowId}:${i + 1}`);
        return { id, provider, rowId, trial: i + 1 };
      }),
    ),
  );
  let state = seed >>> 0;
  for (let i = jobs.length - 1; i > 0; i--) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const j = Math.floor((state / 4294967296) * (i + 1));
    [jobs[i], jobs[j]] = [jobs[j]!, jobs[i]!];
  }
  return jobs;
}
export function sanitize(value: unknown): unknown {
  if (value === undefined) return null;
  const secrets = Object.entries(process.env)
    .filter(
      ([key, val]) =>
        /KEY|TOKEN|SECRET|PASSWORD/.test(key) && val && val.length >= 8,
    )
    .map(([, val]) => val!);
  return JSON.parse(
    JSON.stringify(value, (_key, entry: unknown) =>
      typeof entry === 'string'
        ? secrets.reduce(
            (s, secret) => s.split(secret).join('[REDACTED]'),
            entry,
          )
        : entry,
    ),
  );
}
export function costs(events: Event[]) {
  const groups = {
    llm: [] as Charge[],
    search: [] as Charge[],
    read_page: [] as Charge[],
  };
  for (const e of events) groups[e.type].push(e.charge);
  const sum = (items: Charge[]) =>
    items.reduce((acc, c) => acc + (c.usd ?? 0), 0);
  const total = sum(events.map((e) => e.charge));
  const unknown = events
    .filter((e) => e.charge.usd === null || e.charge.missing)
    .map((e) => e.charge.missing ?? `${e.type}: unavailable`);
  return {
    llmUsd: sum(groups.llm),
    searchUsd: sum(groups.search),
    extractUsd: sum(groups.read_page),
    knownSubtotalUsd: total,
    totalUsd: unknown.length ? null : total,
    unknown,
    basis: 'usage and published pay-as-you-go rates; not an invoice',
  };
}

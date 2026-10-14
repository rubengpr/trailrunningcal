import type { Dossier, ResearchMetadata } from '@/types/blog-research.types';

export class ResearchError extends Error {
  constructor(public readonly code: string, public readonly metadata?: ResearchMetadata) { super(code); }
}

export const dossierSchema = {
  type: 'object', additionalProperties: false,
  required: ['eventName', 'context', 'sources', 'observations'],
  properties: {
    eventName: {type: 'string'}, context: {type: 'string'},
    sources: {type: 'array', items: {type: 'object', additionalProperties: false,
      required: ['title', 'url'], properties: {title: {type: 'string'}, url: {type: 'string'}}}},
    observations: {type: 'array', items: {type: 'string'}},
  },
};

export function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function parseDossier(value: unknown, eventName: string, consulted: string[]): Dossier {
  const invalid = () => { throw new ResearchError('invalid_result'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const record = value as Record<string, unknown>;
  if (record.eventName !== eventName || typeof record.context !== 'string' || !record.context.trim() ||
    !Array.isArray(record.sources) || !Array.isArray(record.observations) || record.observations.some(item => typeof item !== 'string' || !item.trim())) return invalid();
  const urls = new Set(consulted.map(safeSourceUrl).filter(Boolean));
  const sources = record.sources.map(source => {
    if (!source || typeof source !== 'object' || typeof source.title !== 'string' || !source.title.trim() || typeof source.url !== 'string') return invalid();
    const url = safeSourceUrl(source.url);
    if (!url || !urls.has(url)) throw new ResearchError('unverified_source');
    return {title: source.title.trim(), url};
  });
  if (new Set(sources.map(source => source.url)).size !== sources.length) return invalid();
  const context = record.context.trim();
  const observations = (record.observations as string[]).map(item => item.trim());
  // Plain text is rendered by React; citations are the only generated interactive markup.
  const text = [context, ...observations].join('\n');
  if (/<\/?[a-z][^>]*>|https?:\/\//i.test(text)) return invalid();
  const references = [...text.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
  if (references.some(index => index < 1 || index > sources.length) || sources.some((_, index) => !references.includes(index + 1))) return invalid();
  if (!sources.length && !observations.length) return invalid();
  return {eventName, context, sources, observations};
}

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
  const cited = record.sources.map(source => {
    if (!source || typeof source !== 'object' || typeof source.title !== 'string' || !source.title.trim() || typeof source.url !== 'string') return invalid();
    const url = safeSourceUrl(source.url);
    return {title: source.title.trim(), url: url && urls.has(url) ? url : null};
  });
  const sources = cited.flatMap(source => source.url ? [{title: source.title, url: source.url}] : []);
  if (new Set(sources.map(source => source.url)).size !== sources.length) return invalid();
  // Nothing traceable is left: fail instead of returning an unsourced dossier.
  if (cited.length && !sources.length) throw new ResearchError('unverified_source');
  // Plain text is rendered by React; citations are the only generated interactive markup.
  const raw = [record.context.trim(), ...(record.observations as string[]).map(item => item.trim())];
  const text = raw.join('\n');
  if (/<\/?[a-z][^>]*>|https?:\/\//i.test(text)) return invalid();
  const references = [...text.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
  if (references.some(index => index < 1 || index > cited.length) || cited.some((_, index) => !references.includes(index + 1))) return invalid();
  // Drop sources that were not retrieved during research, with their citations, and renumber the rest.
  const renumbered = new Map(cited.flatMap((source, index) => source.url ? [[index + 1, sources.findIndex(s => s.url === source.url) + 1]] : []));
  const [context, ...kept] = raw.map(item => item.replace(/ ?\[(\d+)\]/g, (match, index) => {
    const next = renumbered.get(Number(index));
    return next ? match.replace(index, String(next)) : match.startsWith(' ') ? ' ' : '';
  }).replace(/ +([.,;:])/g, '$1').replace(/ {2,}/g, ' ').trim());
  const removed = cited.filter(source => !source.url).map(source => `«${source.title}»`);
  const observations = [...kept.filter(Boolean),
    ...(removed.length ? [`Se han retirado fuentes que no figuraban entre las páginas consultadas: ${removed.join(', ')}. Las afirmaciones que solo se apoyaban en ellas quedan sin referencia.`] : [])];
  if (!context) return invalid();
  if (!sources.length && !observations.length) return invalid();
  return {eventName, context, sources, observations};
}

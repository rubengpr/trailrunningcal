import { marked } from 'marked';
import { GenerationError, parseArticle } from '@/lib/blog/content';
import { sanitizeContent } from '@/lib/blog/sanitize';
import { allowedLinks, calendarPath, eventPath } from '@/lib/blog/links';
import type { SelectionContext } from '@/types/blog-selection.types';

export function selectionSchema(context: SelectionContext) {
  const string = {type: 'string'};
  return {type: 'object', additionalProperties: false, required: ['introduction', 'selection', 'events', 'conclusion', 'primaryKeyword', 'slug', 'seoTitle', 'metaDescription'], properties: {
    introduction: string, selection: string, conclusion: string,
    primaryKeyword: string, slug: string, seoTitle: string, metaDescription: string,
    events: {type: 'array', minItems: 5, maxItems: 5, items: {type: 'object', additionalProperties: false,
      required: ['eventId', 'contentMarkdown'], properties: {eventId: {type: 'string', enum: context.events.map(event => event.id)}, contentMarkdown: string}}},
  }};
}
function escape(value: string | number): string {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]!));
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GenerationError('invalid_content');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 100_000 || /(?:https?:\/\/|www\.)/i.test(value)) throw new GenerationError('invalid_content');
  return value.trim();
}
function fragment(value: string, headings = false): string {
  const tokens = marked.lexer(value);
  marked.walkTokens(tokens, token => {
    if (['html','link','image','def','code','codespan'].includes(token.type) ||
      (token.type === 'heading' && (!headings || token.depth !== 3)) || (token.type === 'list_item' && token.task)) throw new GenerationError('invalid_content');
  });
  return marked.parser(tokens);
}
export function composeSelection(value: unknown, context: SelectionContext) {
  const body = record(value);
  if (Object.keys(body).length !== 8 || !Array.isArray(body.events) || body.events.length !== 5) throw new GenerationError('invalid_content');
  const descriptions = body.events.map(item => {
    const event = record(item);
    if (Object.keys(event).length !== 2) throw new GenerationError('invalid_content');
    return {id: text(event.eventId), markdown: text(event.contentMarkdown)};
  });
  if (new Set(descriptions.map(item => item.id)).size !== 5 || descriptions.some(item => !context.events.some(event => event.id === item.id))) throw new GenerationError('invalid_content');
  const intro = text(body.introduction), selection = text(body.selection), conclusion = text(body.conclusion);
  const title = `Las 5 mejores carreras de trail running en ${context.regionName}`;
  const article = parseArticle({title, contentMarkdown: [intro, selection, ...descriptions.map(item => item.markdown), conclusion].join('\n\n'),
    primaryKeyword: text(body.primaryKeyword), slug: text(body.slug), seoTitle: text(body.seoTitle), metaDescription: text(body.metaDescription)});
  const races = (event: SelectionContext['events'][number]) => event.races.map(race =>
    `${race.name ? escape(race.name) + ': ' : ''}${escape(race.distanceKm)} km${race.elevationGainM === null ? '' : ` · +${escape(race.elevationGainM)} m`}`).join('<br>');
  const location = (event: SelectionContext['events'][number]) => [...new Set(event.races.map(race => `${race.city}, ${race.province}`))].map(escape).join('<br>');
  const table = '<table><thead><tr><th>Evento</th><th>Localidad y provincia</th><th>Modalidades</th></tr></thead><tbody>' +
    context.events.map(event => `<tr><td>${escape(event.name)}</td><td>${location(event)}</td><td>${races(event)}</td></tr>`).join('') + '</tbody></table>';
  const sections = context.events.map(event => `<h2>${escape(event.name)}</h2><p>${location(event)}</p><p>${races(event)}</p>` +
    fragment(descriptions.find(item => item.id === event.id)!.markdown, true) + `<p><a href="${escape(eventPath(event.slug))}">Ver ${escape(event.name)} en Trailrunningcal</a></p>`).join('');
  const html = fragment(intro) + '<h2>Cómo hemos seleccionado estos eventos</h2>' + fragment(selection) +
    '<h2>Comparativa de los cinco eventos</h2>' + table + sections + '<h2>Cómo elegir tu próximo evento</h2>' + fragment(conclusion) +
    `<p><a href="${escape(calendarPath(context))}">Ver el calendario de trail running en ${escape(context.regionName)}</a></p>`;
  return {article, contentHtml: sanitizeContent(html, allowedLinks(context))};
}

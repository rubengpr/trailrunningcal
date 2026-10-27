import Ajv from 'ajv';
import { marked } from 'marked';
import { visibleText } from '@/lib/blog/writing/text';
import { inspectQuality } from '@/lib/blog/writing/quality';
import {
  GenerationError,
  parseArticle,
  renderContent,
} from '@/lib/blog/content';
import { calendarPath, eventPath, writingLinks } from '@/lib/blog/links';
import { normalizeText, WritingError } from '@/lib/blog/writing/context';
import { writingSchema } from '@/lib/blog/writing/schema';
import type {
  WritingInput,
  WritingRequest,
  WritingResponse,
  WritingResult,
} from '@/types/blog-writing.types';


function key(value: string) {
  return normalizeText(value).toLocaleLowerCase('es');
}
function escapeLabel(value: string): string {
  return value.replace(/[\\`*_{}\[\]()<>!#|]/g, '\\$&');
}

export function compose(
  value: unknown,
  request: WritingRequest,
  input: WritingInput,
): Pick<WritingResult, 'article' | 'contentHtml' | 'references' | 'quality'> {
  const validate = new Ajv().compile<WritingResponse>(writingSchema(input));
  if (!validate(value)) throw new GenerationError('invalid_content');
  const { references: claims, ...fields } = value;
  const article = parseArticle(fields);
  if (
    article.title !==
      `Las 5 mejores carreras de trail running en ${input.regionName}` ||
    /\[\d+\]/.test(article.contentMarkdown)
  )
    throw new GenerationError('invalid_content');
  // Validate the model's original Markdown before inserting any trusted links.
  renderContent(article.contentMarkdown);
  const quality = inspectQuality(article, request.events);
  const tokens = marked.lexer(article.contentMarkdown, { gfm: true });
  const events = request.events;
  const order: string[] = [];
  const sections = new Map<string, string>();
  let current: string | null = null;
  let markdown = '';
  const closeSection = () => {
    if (current && events.find(event => event.eventId === current)!.dossier) {
      const event = events.find((event) => event.eventId === current)!;
      markdown += `\n\n[Ver ${escapeLabel(event.eventName)} en Trailrunningcal](${eventPath(event.slug)})\n\n`;
    }
    current = null;
  };
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      closeSection();
      const heading = visibleText(marked.parser([token]));
      const event = events.find((event) => key(event.eventName) === key(heading));
      if (event) {
        current = event.eventId;
        order.push(event.eventId);
      }
    } else if (current && events.find(event => event.eventId === current)!.dossier) {
      sections.set(current, (sections.get(current) ?? '') + token.raw);
    }
    markdown += token.raw;
  }
  closeSection();
  if (
    order.length !== 5 ||
    new Set(order).size !== 5 ||
    events.some((event) => event.dossier ? !sections.get(event.eventId)?.trim() : !!sections.get(event.eventId)?.trim())
  )
    throw new GenerationError('invalid_content');

  const seen = new Set<string>();
  const references = claims.map((claim) => {
    const event = events.find((event) => event.eventName === claim.eventName)!;
    const dossier = input.events.find(
      (item) => item.eventName === claim.eventName,
    )!.dossier;
    const excerpt = normalizeText(claim.excerpt);
    const body = visibleText(
      marked.parser(marked.lexer(sections.get(event.eventId)!)),
    );
    const identity = `${event.eventId}:${excerpt}`;
    if (
      !dossier ||
      !excerpt ||
      excerpt.length > 2000 ||
      !body.includes(excerpt) ||
      seen.has(identity) ||
      new Set(claim.sourceIndexes).size !== claim.sourceIndexes.length ||
      claim.sourceIndexes.some((index) => index > dossier.sources.length)
    )
      throw new WritingError('invalid_references');
    seen.add(identity);
    return {
      eventId: event.eventId,
      excerpt,
      sources: claim.sourceIndexes.map((index) => dossier.sources[index - 1]),
    };
  });
  for (const event of events) {
    const dossier = input.events.find(
      (item) => item.eventName === event.eventName,
    )!.dossier;
    if (
      dossier?.sources.length &&
      !references.some((reference) => reference.eventId === event.eventId)
    )
      throw new WritingError('invalid_references');
  }
  markdown += `\n\n[Ver el calendario de trail running en ${escapeLabel(input.regionName)}](${calendarPath(request)})\n`;
  article.contentMarkdown = markdown.trim();
  return {
    article,
    quality,
    contentHtml: renderContent(
      article.contentMarkdown,
      writingLinks(request),
    ),
    references,
  };
}

import { marked } from 'marked';
import type { Token } from 'marked';
import { GenerationError } from '@/lib/blog/content';
import { lengthRange, type LengthField } from '@/lib/blog/length-targets';
import { normalizeText } from '@/lib/blog/writing/context';
import { visibleText } from '@/lib/blog/writing/text';
import type { Article } from '@/types/blog-article.types';
import type { QualityObservation, WritingQuality, WritingRequest } from '@/types/blog-writing.types';

function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

function comparable(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function textOf(tokens: Token[], excludeHeadings = false): string {
  return visibleText(marked.parser(tokens),{excludeHeadings});
}

// Inspect only the authored body, before trusted navigation links are composed.
// This checks structure and measurable recommendations, not editorial truth.
export function inspectQuality(article: Article, events: WritingRequest['events']): WritingQuality {
  const tokens = marked.lexer(article.contentMarkdown, {gfm:true});
  const fail = () => { throw new GenerationError('invalid_content'); };
  marked.walkTokens(tokens, token => {
    if (token.type === 'heading' && !words(textOf([token])).length) fail();
  });

  const firstHeading = tokens.findIndex(token => token.type === 'heading' && token.depth === 2);
  const introduction = tokens.slice(0, firstHeading < 0 ? 0 : firstHeading);
  if (!introduction.some(token => token.type === 'paragraph' && words(textOf([token])).length)) fail();

  const sections: Array<{eventId:string|null;tokens:Token[]}> = [];
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      const name = normalizeText(textOf([token])).toLocaleLowerCase('es');
      const event = events.find(item => normalizeText(item.eventName).toLocaleLowerCase('es') === name);
      sections.push({eventId:event?.eventId ?? null,tokens:[]});
    } else if (sections.length) sections[sections.length-1].tokens.push(token);
  }
  const eventSections = sections.filter(section => section.eventId !== null);
  if (eventSections.length !== events.length || new Set(eventSections.map(section => section.eventId)).size !== events.length) fail();
  for (const section of eventSections) {
    // A subsection heading alone does not constitute an event description.
    const event = events.find(event => event.eventId === section.eventId)!;
    if (event.dossier ? !words(textOf(section.tokens,true)).length : section.tokens.some(token => token.type !== 'space')) fail();
  }
  const lastEvent = sections.findLastIndex(section => section.eventId !== null);
  if (!sections.slice(lastEvent+1).some(section => words(textOf(section.tokens,true)).length)) fail();

  const metrics:WritingQuality['metrics'] = {
    wordCount:words(textOf(tokens)).length,
    keywordWordCount:words(article.primaryKeyword).length,
    slugWordCount:words(article.slug).length,
    characters:{title:[...article.title].length,slug:[...article.slug].length,
      seoTitle:[...article.seoTitle].length,metaDescription:[...article.metaDescription].length},
  };
  const observations:QualityObservation[] = [];
  const range = (field:Exclude<QualityObservation['field'],'introduction'>, unit:'characters'|'words', actual:number, min:number, max:number) => {
    if (actual < min || actual > max) observations.push({code:'length_out_of_range',field,unit,actual,min,max});
  };
  const target = (field:LengthField, unit:'characters'|'words') => { const {min,max} = lengthRange(field,unit); return [min,max] as const; };
  range('title','characters',metrics.characters.title,...target('title','characters'));
  range('contentMarkdown','words',metrics.wordCount,...target('content','words'));
  range('primaryKeyword','words',metrics.keywordWordCount,...target('primaryKeyword','words'));
  range('slug','words',metrics.slugWordCount,...target('slug','words'));
  range('slug','characters',metrics.characters.slug,...target('slug','characters'));
  range('seoTitle','characters',metrics.characters.seoTitle,...target('seoTitle','characters'));
  range('metaDescription','characters',metrics.characters.metaDescription,...target('metaDescription','characters'));
  const keyword = comparable(article.primaryKeyword);
  const targets = {title:article.title,introduction:textOf(introduction),seoTitle:article.seoTitle,slug:article.slug,metaDescription:article.metaDescription};
  for (const [field,text] of Object.entries(targets)) {
    if (!keyword || !` ${comparable(text)} `.includes(` ${keyword} `)) {
      observations.push({code:'keyword_missing',field:field as keyof typeof targets});
    }
  }

  const paragraphs = new Map<string,{text:string;events:Set<string>}>();
  for (const section of eventSections) {
    marked.walkTokens(section.tokens, token => {
      if (token.type !== 'paragraph') return;
      const text = textOf([token]);
      if (words(text).length < 20) return;
      const key = comparable(text);
      const paragraph = paragraphs.get(key) ?? {text,events:new Set<string>()};
      paragraph.events.add(section.eventId!);
      paragraphs.set(key,paragraph);
    });
  }
  for (const paragraph of paragraphs.values()) {
    if (paragraph.events.size < 2) continue;
    for (const eventId of paragraph.events) observations.push({code:'repeated_paragraph',field:'contentMarkdown',eventId,
      relatedEventIds:[...paragraph.events].filter(id => id !== eventId),excerpt:paragraph.text});
  }
  return {metrics,observations};
}

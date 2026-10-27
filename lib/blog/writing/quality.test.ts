import { describe, expect, it } from 'vitest';
import { inspectQuality } from './quality';
import { compose } from './result';
import { prepare } from './context';
import { writingRequest, writingResponse } from '@/tests/fixtures/blog-writing';

const inspect = (article = writingResponse) => inspectQuality(article,writingRequest.events);
const prepared = prepare(writingRequest);

describe('required editorial structure', () => {
  it.each(['no-intro','list-intro','no-closing','empty-closing','heading-only-event','quoted-heading-only-event','empty-event','empty-heading'])('rejects %s', mode => {
    const value = structuredClone(writingResponse);
    if (mode === 'no-intro') value.contentMarkdown = value.contentMarkdown.slice(value.contentMarkdown.indexOf('## '));
    if (mode === 'list-intro') value.contentMarkdown = value.contentMarkdown.replace(/^[^\n]+/,'- Introducción solo como lista.');
    if (mode === 'no-closing') value.contentMarkdown = value.contentMarkdown.split('## Elige tu próximo evento')[0] + 'Una conclusión sin H2.';
    if (mode === 'empty-closing') value.contentMarkdown = value.contentMarkdown.split('## Elige tu próximo evento')[0] + '## Cierre\n\n### Solo subtítulo';
    if (mode === 'heading-only-event' || mode === 'quoted-heading-only-event' || mode === 'empty-event') value.contentMarkdown = value.contentMarkdown.replace(/## Evento 0[\s\S]*?(?=## Evento 1)/,`## Evento 0\n\n${mode === 'empty-event' ? '---' : mode === 'quoted-heading-only-event' ? '> ### Solo subtítulo' : '### Solo subtítulo'}\n\n`);
    if (mode === 'empty-heading') value.contentMarkdown += '\n\n###\n';
    expect(() => compose(value,prepared.request,prepared.input)).toThrow('invalid_content');
  });
  it('accepts selection criteria within the introduction and a freely named closing', () => {
    const value = structuredClone(writingResponse);
    value.contentMarkdown = value.contentMarkdown.replace('## Una selección editorial\n\n','').replace('## Elige tu próximo evento','## Decide con criterio');
    expect(() => compose(value,prepared.request,prepared.input)).not.toThrow();
  });
});

describe('non-blocking editorial ranges', () => {
  it.each([
    ['title',39,40,90],['title',40,40,90],['title',90,40,90],['title',91,40,90],
    ['seoTitle',44,45,60],['seoTitle',45,45,60],['seoTitle',60,45,60],['seoTitle',61,45,60],
    ['metaDescription',139,140,160],['metaDescription',140,140,160],['metaDescription',160,140,160],['metaDescription',161,140,160],
    ['slug',74,1,74],['slug',75,1,74],
  ] as const)('%s character boundary %s', (field,length,min,max) => {
    const article = {...writingResponse,[field]:'a'.repeat(length)};
    const report = inspect(article);
    expect(report.metrics.characters[field]).toBe(length);
    expect(report.observations.some(item => item.code === 'length_out_of_range' && item.field === field && item.unit === 'characters')).toBe(length < min || length > max);
  });
  it.each([1499,1500,2000,2001])('counts visible body words at %s excluding Markdown and metadata', count => {
    const base = inspect().metrics.wordCount;
    const extra = Array.from({length:count-base},()=>'**palabra**').join(' ');
    const report = inspect({...writingResponse,contentMarkdown:writingResponse.contentMarkdown+'\n\n'+extra});
    expect(report.metrics.wordCount).toBe(count);
    expect(report.observations.some(item => item.code === 'length_out_of_range' && item.field === 'contentMarkdown')).toBe(count < 1500 || count > 2000);
  });
  it.each([1,2,6,7])('keyword boundary %s words', count => {
    const report = inspect({...writingResponse,primaryKeyword:Array.from({length:count},()=>'trail').join(' ')});
    expect(report.metrics.keywordWordCount).toBe(count);
    expect(report.observations.some(item => item.code === 'length_out_of_range' && item.field === 'primaryKeyword')).toBe(count < 2 || count > 6);
  });
  it.each([2,3,8,9])('slug boundary %s words', count => {
    const report = inspect({...writingResponse,slug:Array.from({length:count},()=>'trail').join('-')});
    expect(report.metrics.slugWordCount).toBe(count);
    expect(report.observations.some(item => item.code === 'length_out_of_range' && item.field === 'slug' && item.unit === 'words')).toBe(count < 3 || count > 8);
  });
  it('counts Unicode characters rather than surrogate halves', () => {
    expect(inspect({...writingResponse,seoTitle:'🏔'.repeat(45)}).metrics.characters.seoTitle).toBe(45);
  });
  it('returns observations without rejecting and excludes the six inserted navigation links', () => {
    const result = compose(writingResponse,prepared.request,prepared.input);
    expect(result.quality).toEqual(inspect({ ...writingResponse, slug: result.article.slug }));
    expect(result.quality.observations.some(item => item.code === 'length_out_of_range')).toBe(true);
    expect(result.article.contentMarkdown).toContain('[Ver Evento 0');
  });
});

describe('literal keyword presence', () => {
  it('ignores accents, case and separators across all target fields', () => {
    const report = inspect({...writingResponse,primaryKeyword:'TRÁIL RUNNING EN CATALUÑA',
      title:'Trail running en Cataluña',seoTitle:'Trail-running-en-Cataluna',slug:'trail-running-en-cataluna',
      metaDescription:'Encuentra TRAIL: running en Cataluña.'});
    expect(report.observations.filter(item => item.code === 'keyword_missing')).toEqual([]);
  });
  it('does not match substrings of words or unrelated sections as the introduction', () => {
    const report = inspect({...writingResponse,primaryKeyword:'trail',title:'trailer',seoTitle:'ultratrail',
      contentMarkdown:writingResponse.contentMarkdown.replace('Estos cinco eventos reúnen distintas modalidades de trail running en Cataluña.','Compara estas cinco propuestas.')});
    expect(report.observations).toContainEqual({code:'keyword_missing',field:'title'});
    expect(report.observations).toContainEqual({code:'keyword_missing',field:'seoTitle'});
    expect(report.observations).toContainEqual({code:'keyword_missing',field:'introduction'});
  });
});

describe('repeated paragraphs', () => {
  function withParagraphs(count:number, repeatInAnotherEvent:boolean) {
    const paragraph = Array.from({length:count},()=>'montaña').join(' ');
    let body = writingResponse.contentMarkdown.replace('## Evento 0',`## Evento 0\n\n${paragraph}\n\n${paragraph}`);
    if (repeatInAnotherEvent) body = body.replace('## Evento 1',`## Evento 1\n\n**${paragraph.toUpperCase()}**`);
    return inspect({...writingResponse,contentMarkdown:body});
  }
  it('reports both affected events once for normalized identical paragraphs of 20 words', () => {
    const repeated = withParagraphs(20,true).observations.filter(item => item.code === 'repeated_paragraph');
    expect(repeated).toHaveLength(2);
    expect(repeated[0]).toMatchObject({eventId:writingRequest.events[0].eventId,relatedEventIds:[writingRequest.events[1].eventId]});
  });
  it('ignores short paragraphs and repetition within one event only', () => {
    expect(withParagraphs(19,true).observations.some(item => item.code === 'repeated_paragraph')).toBe(false);
    expect(withParagraphs(20,false).observations.some(item => item.code === 'repeated_paragraph')).toBe(false);
  });
});

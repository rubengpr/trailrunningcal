import { describe, expect, it } from 'vitest';
import { prepare } from './context';
import { compose } from './result';
import { renderContent } from '@/lib/blog/content';
import { writingRequest, writingResponse } from '@/tests/fixtures/blog-writing';

describe('writer context', () => {
  it('uses only region, names and dossiers without mutating the request', () => {
    const value = structuredClone(writingRequest);
    value.events.reverse();
    value.events[0].dossier.observations = ['El mes habitual no está documentado.'];
    const {input} = prepare(value);
    expect(input.regionName).toBe('Cataluña');
    expect(input.events[0]).toEqual({eventName:value.events[0].eventName,dossier:value.events[0].dossier});
    expect(JSON.stringify(input)).not.toMatch(/eventId|consultedSources|regionId|catalog|slug|race-/);
    expect(Object.keys(input.events[0].dossier!)).toEqual(['context','sources','observations']);
    input.events[0].dossier!.context = 'Mutated';
    expect(value.events[0].dossier.context).not.toBe('Mutated');
  });
  it.each([
    'missing',
    'duplicate',
    'empty-name',
    'duplicate-name',
    'unverified',
    'region',
    'extra',
    'unsafe-slug',
  ])('rejects invalid context: %s', (mode) => {
    const value = structuredClone(writingRequest);
    if (mode === 'missing') value.events.pop();
    if (mode === 'duplicate') value.events[1] = value.events[0];
    if (mode === 'empty-name') value.events[0].eventName = ' ';
    if (mode === 'duplicate-name') value.events[0].eventName = value.events[1].eventName;
    if (mode === 'unverified') value.events[0].consultedSources = [];
    if (mode === 'region') Object.assign(value,{regionId:'andorra'});
    if (mode === 'extra') Object.assign(value, { unexpected: true });
    if (mode === 'unsafe-slug') value.events[0].slug = 'event)';
    expect(() => prepare(value)).toThrow('invalid_context');
  });
  it('accepts an honest partial dossier without sources', () => {
    const value = structuredClone(writingRequest);
    value.events[0].dossier = {
      context: 'No hay contexto adicional utilizable.',
      sources: [],
      observations: ['Información insuficiente.'],
    };
    value.events[0].consultedSources = [];
    expect(prepare(value).input.events[0].dossier!.sources).toEqual([]);
  });
});

describe('writer output', () => {
  const prepared = prepare(writingRequest);
  const run = (value: unknown) =>
    compose(value, prepared.request, prepared.input);
  it('preserves the full authored structure, builds six safe links and resolves private references', () => {
    const result = run(writingResponse);
    expect(result.contentHtml).toContain('<h2>Una selección editorial</h2>');
    expect(result.contentHtml).toContain('<h3>Antes de elegir</h3>');
    expect(result.contentHtml).toContain('<ul>');
    expect(result.contentHtml.match(/href=/g)).toHaveLength(6);
    expect(result.article.contentMarkdown).toContain(
      '[Ver Evento 0 en Trailrunningcal](/es/e/evento-0)',
    );
    expect(result.article.contentMarkdown).toContain(
      '## Elige tu próximo evento',
    );
    expect(result.article.contentMarkdown).not.toContain(
      'Comparativa de los cinco eventos',
    );
    expect(result.contentHtml).not.toContain('example.com');
    expect(result.references[0]).toEqual({
      eventId: writingRequest.events[0].eventId,
      excerpt: writingResponse.references[0].excerpt,
      sources: writingRequest.events[0].dossier.sources,
    });
    expect(() => renderContent(result.article.contentMarkdown,
      [...writingRequest.events.map(event => `/es/e/${event.slug}`),'/es/d/cataluna'])).not.toThrow();
  });
  it.each([
    'missing',
    'duplicate',
    'html',
    'jsx',
    'link',
    'image',
    'h1',
    'h4',
    'citation',
    'url',
  ])('rejects invalid article: %s', (mode) => {
    const value = structuredClone(writingResponse);
    if (mode === 'missing')
      value.contentMarkdown = value.contentMarkdown.replace(
        '## Evento 0',
        '## Otro evento',
      );
    if (mode === 'duplicate')
      value.contentMarkdown += '\n\n## Evento 0\n\nOtro texto.';
    const additions: Record<string, string> = {
      html: '<script>alert(1)</script>',
      jsx: '<Component />',
      link: '[Ver](/es)',
      image: '![Foto](/image)',
      h1: '# H1',
      h4: '#### H4',
      citation: 'Dato [1]',
      url: 'https://example.com',
    };
    value.contentMarkdown += '\n\n' + (additions[mode] ?? '');
    expect(() => run(value)).toThrow('invalid_content');
  });
  it('accepts a different order while preserving event-specific references and links', () => {
    const value = structuredClone(writingResponse);
    const blocks = value.contentMarkdown.split(/(?=^## )/m);
    const events = blocks.filter(block => /^## Evento /.test(block));
    value.contentMarkdown = [blocks[0],blocks[1],...events.reverse(),blocks.at(-1)].join('');
    const result = run(value);
    expect(result.contentHtml.match(/href=/g)).toHaveLength(6);
    expect(result.references).toHaveLength(5);
    expect(result.article.contentMarkdown.indexOf('## Evento 4')).toBeLessThan(result.article.contentMarkdown.indexOf('## Evento 0'));
  });
  it.each([
    'invented',
    'wrong-event',
    'out-of-range',
    'duplicate-index',
    'duplicate-claim',
    'missing',
    'extra',
  ])('rejects invalid references: %s', (mode) => {
    const value = structuredClone(writingResponse);
    if (mode === 'invented') value.references[0].excerpt = 'Invented claim';
    if (mode === 'wrong-event')
      value.references[0].excerpt = value.references[1].excerpt;
    if (mode === 'out-of-range') value.references[0].sourceIndexes = [2];
    if (mode === 'duplicate-index') value.references[0].sourceIndexes = [1, 1];
    if (mode === 'duplicate-claim') value.references.push(value.references[0]);
    if (mode === 'missing') value.references.shift();
    if (mode === 'extra')
      Object.assign(value.references[0], { url: 'https://invented.test' });
    expect(() => run(value)).toThrow();
  });
  it('accepts prose outside editorial length targets and resolves visible emphasis in quotes', () => {
    const value = structuredClone(writingResponse);
    value.contentMarkdown = value.contentMarkdown.replace(
      'pueblo ficticio 0',
      '**pueblo ficticio 0**',
    );
    expect(run(value).references).toHaveLength(5);
  });
});

describe('missing research sections',()=>{
  it('permits H2 only for a failed event, with no link or audit references',()=>{
    const request:import('@/types/blog-writing.types').WritingRequest=structuredClone(writingRequest);
    request.events[0].dossier=null;
    const value=structuredClone(writingResponse);
    const name=request.events[0].eventName;
    const next=request.events[1].eventName;
    const start=value.contentMarkdown.indexOf('## '+name);
    const end=value.contentMarkdown.indexOf('## '+next,start+1);
    value.contentMarkdown=value.contentMarkdown.slice(0,start)+`## ${name}\n\n`+value.contentMarkdown.slice(end);
    value.references=value.references.filter(reference=>reference.eventName!==name);
    const prepared=prepare(request);
    const result=compose(value,prepared.request,prepared.input);
    expect(result.contentHtml).toContain(`<h2>${name}</h2>`);
    expect(result.contentHtml).not.toContain('/es/e/'+request.events[0].slug);
    expect(result.contentHtml.match(/<a /g)).toHaveLength(5);
    const invented=structuredClone(value);invented.contentMarkdown=invented.contentMarkdown.replace(`## ${name}\n`,`## ${name}\n\nContenido inventado.\n`);
    expect(()=>compose(invented,prepared.request,prepared.input)).toThrow('invalid_content');
  });
  it('rejects five missing dossiers before inference',()=>{
    const request:import('@/types/blog-writing.types').WritingRequest=structuredClone(writingRequest);
    request.events.forEach(event=>{event.dossier=null;});
    expect(()=>prepare(request)).toThrow('invalid_context');
  });
});

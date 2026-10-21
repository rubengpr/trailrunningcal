import { expect, it } from 'vitest';
import { dossier } from '@/tests/fixtures/blog-research';
import { parseDossier, safeSourceUrl } from './result';
it.each(['javascript:alert(1)','data:text/html,hi','https://user:password@example.com','invalid'])('rejects unsafe URL %s',value => expect(safeSourceUrl(value)).toBeNull());
it.each([
  {...dossier,eventName:'Duplicated name'}, {...dossier,context:'Texto [0]'}, {...dossier,context:'Texto [2]'},
  {...dossier,context:'Texto sin referencia'}, {...dossier,context:'<script>alert(1)</script> [1]'},
  {...dossier,context:'https://evil.example [1]'}, {...dossier,sources:[...dossier.sources,...dossier.sources]},
  {...dossier,sources:[],context:'No hay datos',observations:[]}, null, [],
])('rejects invalid citations and content %#',value => {
  expect(() => parseDossier(value,[dossier.sources[0].url])).toThrow('invalid_result');
});
it('accepts observed URL canonicalization',() => {
  expect(parseDossier(dossier,['https://example.com/event']).context).toContain('[1]');
});
it('drops sources not retrieved during research with their citations and renumbers the rest',() => {
  const extra = {title:'Inventada',url:'https://example.com/guessed'};
  const value = {...dossier, sources:[extra,...dossier.sources], context:'Dato dudoso [1]. Dato firme [2].', observations:['Nota [1][2]']};
  const parsed = parseDossier(value,[dossier.sources[0].url]);
  expect(parsed.sources).toEqual(dossier.sources);
  expect(parsed.context).toBe('Dato dudoso. Dato firme [1].');
  expect(parsed.observations[0]).toBe('Nota [1]');
  expect(parsed.observations[1]).toContain('«Inventada»');
});
it('fails when no cited source was retrieved',() => {
  expect(() => parseDossier(dossier,['https://other.example'])).toThrow('unverified_source');
});

it('normalizes redundant Web Search links in context and observations to validated numbered citations',() => {
  const value = {...dossier,
    context:'Texto [1] ([Organizador](https://example.com/event?utm_source=openai)).',
    observations:['Nota ([Organizador](https://example.com/event?utm_source=openai)).'],
  };
  const parsed = parseDossier(value,[dossier.sources[0].url]);
  expect(parsed.context).toBe('Texto [1].');
  expect(parsed.observations).toEqual(['Nota [1].']);
  expect(parsed.sources).toEqual(dossier.sources);
});
it('converts a declared source link to a citation without requiring a duplicate numeric reference',() => {
  const parsed = parseDossier({...dossier,context:'Texto [Organizador](https://example.com/event).'},[dossier.sources[0].url]);
  expect(parsed.context).toBe('Texto [1].');
});
it.each([
  'Texto [1] ([Inventada](https://unknown.example/event)).',
  'Texto [1] ([Otro documento](https://example.com/event?edition=2025)).',
  'Texto [1] ![Imagen](https://example.com/event).',
  'Texto [1] [Peligroso](javascript:alert(1)). https://unknown.example',
])('does not hide unverified links, meaningful query changes or images: %s',context => {
  expect(() => parseDossier({...dossier,context},[dossier.sources[0].url])).toThrow('invalid_result');
});
it('keeps validation of missing or out-of-range numbered citations after normalization',() => {
  expect(() => parseDossier({...dossier,context:'Texto [2] ([Organizador](https://example.com/event)).'},[dossier.sources[0].url])).toThrow('invalid_result');
});

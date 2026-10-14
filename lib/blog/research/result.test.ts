import { expect, it } from 'vitest';
import { dossier } from '@/tests/fixtures/blog-research';
import { parseDossier, safeSourceUrl } from './result';
it.each(['javascript:alert(1)','data:text/html,hi','https://user:password@example.com','invalid'])('rejects unsafe URL %s',value => expect(safeSourceUrl(value)).toBeNull());
it.each([
  {...dossier,context:'Texto [0]'}, {...dossier,context:'Texto [2]'},
  {...dossier,context:'Texto sin referencia'}, {...dossier,context:'<script>alert(1)</script> [1]'},
  {...dossier,context:'https://evil.example [1]'}, {...dossier,sources:[...dossier.sources,...dossier.sources]},
  {...dossier,sources:[],context:'No hay datos',observations:[]}, null, [],
])('rejects invalid citations and content %#',value => {
  expect(() => parseDossier(value,dossier.eventName,[dossier.sources[0].url])).toThrow('invalid_result');
});
it('accepts observed URL canonicalization',() => {
  expect(parseDossier(dossier,dossier.eventName,['https://example.com/event']).context).toContain('[1]');
});
it('drops sources not retrieved during research with their citations and renumbers the rest',() => {
  const extra = {title:'Inventada',url:'https://example.com/guessed'};
  const value = {...dossier, sources:[extra,...dossier.sources], context:'Dato dudoso [1]. Dato firme [2].', observations:['Nota [1][2]']};
  const parsed = parseDossier(value,dossier.eventName,[dossier.sources[0].url]);
  expect(parsed.sources).toEqual(dossier.sources);
  expect(parsed.context).toBe('Dato dudoso. Dato firme [1].');
  expect(parsed.observations[0]).toBe('Nota [1]');
  expect(parsed.observations[1]).toContain('«Inventada»');
});
it('fails when no cited source was retrieved',() => {
  expect(() => parseDossier(dossier,dossier.eventName,['https://other.example'])).toThrow('unverified_source');
});

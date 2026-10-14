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

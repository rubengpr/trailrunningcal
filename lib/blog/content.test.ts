import { describe, expect, it } from 'vitest';
import { GenerationError, parseArticle, renderContent } from './content';
import { sanitizeContent } from './sanitize';

const article = { title: 'Una primera carrera', contentMarkdown: 'Introducción.\n\n## Una sección\n\nContenido útil.',
  primaryKeyword: 'primera carrera', slug: '¡Priméra Carrera!', seoTitle: 'Primera carrera', metaDescription: 'Descripción.' };
describe('article validation and rendering', () => {
  it('normalizes slugs without enforcing editorial lengths', () => {
    expect(parseArticle(article).slug).toBe('primera-carrera');
  });
  it.each([null, [], {}, { ...article, title: '' }, { ...article, slug: '!!!' },
    { ...article, extra: 'unexpected' }, { ...article, seoTitle: '<script>alert(1)</script>' }])('rejects invalid article %#', value => {
    expect(() => parseArticle(value)).toThrow(GenerationError);
  });
  it('renders headings, lists, emphasis and tables', () => {
    const html = renderContent('## Sección\n\n**Texto**\n\n- Uno\n- Dos\n\n| A | B |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<h2>Sección</h2>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<table>');
    expect(html).not.toMatch(/style=|class=/);
  });
  it.each(['<script>alert(1)</script>', '[texto](/es)', '![foto](/foto.png)',
    '[texto][ref]\n\n[ref]: /es', 'https://example.com', '# Título', '#### Salto',
    '### Antes de h2', '`código`'])('rejects prohibited Markdown %#', markdown => {
    expect(() => renderContent(markdown + '\n\n## Sección\n\nTexto')).toThrow(GenerationError);
  });
  it('removes scripts, images, links and attributes from stored HTML', () => {
    const html = sanitizeContent('<p onclick="evil()">Texto <a href="/es">enlace</a></p><script>evil()</script><img src="x">');
    expect(html).toBe('<p>Texto enlace</p>');
  });
});

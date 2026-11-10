import { describe, it, expect } from 'vitest';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import remarkGfm from 'remark-gfm';
import matter from 'gray-matter';
import { exportFixture as draft } from '@/tests/fixtures/blog-export';
import { prepareDocument, renderDocument } from './export';

describe('article export', () => {
  it('requires complete content and saved publication fields without enforcing evaluation', () => {
    expect(prepareDocument(draft).blocks).toHaveLength(1);
    for (const value of [{ ...draft, status: 'running' as const }, { ...draft, slug: '../bad' }, { ...draft, title: '' },
      { ...draft, publication: undefined }, { ...draft, publication: { ...draft.publication!, imagePath: null } },
      { ...draft, publication: { ...draft.publication!, imageAlt: '' } }, { ...draft, contentHtml: '' }]) {
      expect(() => prepareDocument(value)).toThrow();
    }
  });
  it('preserves order, links, formatting, tables and literal MDX-looking content', async () => {
    const html = '<h2>Rutas &amp; pueblos</h2><p>Hola <strong>montaña</strong>, {globalThis.evil()} &lt;script&gt;. <em>Corre</em><br>y descubre.</p><p>import x from "x"</p><p>export const y = 1</p><ul><li>Una ruta</li></ul><blockquote>Una cita</blockquote><p><a href="/es">Calendario</a></p><table><thead><tr><th>Nombre</th><th>Km</th></tr></thead><tbody><tr><td>Alba | Núria</td><td>22</td></tr></tbody></table>';
    const blocks = [...prepareDocument({ ...draft, contentHtml: html, articleLinks: ['/es'] }).blocks, { id: 'i', type: 'image' as const, path: 'image', alt: 'A "foto" {x}', caption: 'Pie <b>literal</b>', metadata: { width: 800, height: 600, bytes: 100, format: 'png' } }];
    const file = await renderDocument({ ...draft, articleLinks: ['/es'] }, blocks, new Map([[draft.publication!.imagePath!, 'https://example.com/cover.png'], ['image', 'https://example.com/inside.png']]));
    const parsed = matter(file.content);
    expect(parsed.data).toMatchObject({ author: 'Ruben Godoy', translationKey: draft.slug, seoTitle: draft.seoTitle, readTime: '1 min' });
    expect(file.content).toContain('<BlogImage');
    const { default: Content } = await evaluate(parsed.content, { ...runtime, remarkPlugins: [remarkGfm],
      useMDXComponents: () => ({ DateAuthorString: () => null, BlogHeaderImage: () => null, BlogImage: () => createElement('img', { alt: 'safe' }) }) });
    const rendered = renderToStaticMarkup(createElement(Content));
    expect(rendered).toContain('{globalThis.evil()}'); expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).toContain('<table>'); expect(rendered).toContain('Alba | Núria'); expect(rendered).toContain('<strong>montaña</strong>'); expect(rendered).toContain('import x');
    expect(rendered).toContain('href="/es"'); expect(rendered).not.toContain('<script>');
  });
  it('exports tables without a header and rejects missing image descriptions', async () => {
    const source = { ...draft, contentHtml: '<table><tr><td>Alba | Núria</td><td>22</td></tr></table>' };
    const { blocks } = prepareDocument(source);
    const file = await renderDocument(source, blocks, new Map([[draft.publication!.imagePath!, 'https://example.com/cover.png']]));
    expect(file.content).toContain('Alba \\| Núria');
    expect(() => prepareDocument({ ...draft, articleDocument: { version: 0, blocks: [...blocks,
      { id: 'i', type: 'image', path: 'x', alt: '', caption: '', metadata: { width: 1, height: 1, bytes: 1, format: 'png' } },
    ] } })).toThrow('missing_alt');
  });

});

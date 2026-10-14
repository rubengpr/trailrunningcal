import { describe, expect, it } from 'vitest';
import { composeSelection } from './selection-content';
import { allowedLinks } from './links';
import { inspect } from './scoring/rules';
import { sanitizeContent } from './sanitize';
import { context, response } from '@/tests/fixtures/blog-selection';

describe('regional article composition', () => {
  it('composes source data, ordered headings and only the six approved links', () => {
    const result = composeSelection({...response, events: [...response.events].reverse()}, context);
    expect(result.article.title).toBe('Las 5 mejores carreras de trail running en Cataluña');
    expect(result.article.slug).toBe('mejores-carreras-cataluna');
    expect(result.contentHtml).toContain('<table>');
    expect(result.contentHtml.indexOf('<h2>Evento 0')).toBeLessThan(result.contentHtml.indexOf('<h2>Evento 1'));
    expect(result.contentHtml.match(/href=/g)).toHaveLength(6);
    allowedLinks(context).forEach(link => expect(result.contentHtml).toContain(`href="${link}"`));
    expect(result.contentHtml).not.toContain('null');
    expect(result.contentHtml).not.toContain('2026');
    const input = {...result.article, contentHtml: result.contentHtml, instructions: 'Selecciona cinco eventos', generationContext: context};
    expect(inspect(input).criticalErrors).toEqual([]);
    expect(inspect({...input, generationContext: null}).criticalErrors.some(error => error.code === 'links_not_allowed')).toBe(true);
  });
  it('escapes source names and locations instead of interpreting them as HTML', () => {
    const modified = structuredClone(context); modified.events[0].name = '<img src=x> & test';
    modified.events[0].races[0].city = '<script>alert(1)</script>';
    const html = composeSelection(response, modified).contentHtml;
    expect(html).toContain('&lt;img'); expect(html).not.toContain('<img'); expect(html).not.toContain('<script');
  });
  it.each(['<script>alert(1)</script>', '[enlace](/es/e/otro)', '![foto](/foto)', '# Otro título', '## Otro evento', '```js\nx\n```'])('rejects forbidden model markup %s', contentMarkdown => {
    expect(() => composeSelection({...response, events: response.events.map(event => ({...event, contentMarkdown}))}, context)).toThrow('invalid_content');
  });
  it.each(['missing','duplicate','extra','unknown'])('rejects %s event identifiers', mode => {
    const events = structuredClone(response.events);
    if (mode === 'missing') events.pop();
    if (mode === 'extra') events.push(events[0]);
    if (mode === 'duplicate') events[1].eventId = events[0].eventId;
    if (mode === 'unknown') events[0].eventId = 'other';
    expect(() => composeSelection({...response, events}, context)).toThrow('invalid_content');
  });
  it('rejects missing metadata and URLs, and removes unsafe anchor attributes', () => {
    expect(() => composeSelection({...response, seoTitle: ''}, context)).toThrow();
    expect(() => composeSelection({...response, conclusion: 'https://outside.test'}, context)).toThrow();
    const html = sanitizeContent('<a href="javascript:alert(1)" onclick="x">bad</a><a href="/es/e/evento-0" onclick="x">good</a>', allowedLinks(context));
    expect(html).not.toContain('javascript'); expect(html).not.toContain('onclick'); expect(html).toContain('href="/es/e/evento-0"');
    const result = composeSelection(response, context);
    const checks = inspect({...result.article, instructions: 'Encargo', generationContext: context, contentHtml: result.contentHtml + '<a href="/es/e/other">otro</a>'});
    expect(checks.criticalErrors.some(error => error.code === 'links_not_allowed')).toBe(true);
  });
});

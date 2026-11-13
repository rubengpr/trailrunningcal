import { describe, expect, it } from 'vitest';
import { compose } from '@/lib/blog/writing/result';
import { prepare as prepareContext } from '@/lib/blog/writing/context';
import { writingRequest, writingResponse } from '@/tests/fixtures/blog-writing';
import { apply, prepare } from '@/lib/blog/editing/result';
import type { WritingRequest } from '@/types/blog-writing.types';
import type { EditingRequest, EditingResponse } from '@/types/blog-editing.types';

function fixture() {
  const source = { ...compose(writingResponse, writingRequest, prepareContext(writingRequest).input), model: 'writer', responseId: 'response', durationMs: 10, usage: null };
  const request: EditingRequest = { source, context: writingRequest };
  const input = prepare(request);
  const response: EditingResponse = {
    edits: input.blocks.filter(block => block.editable).map(block => ({ id: block.id, markdown: block.markdown.trim() })),
    references: input.references.map(reference => ({ id: reference.id, blockId: reference.blockIds[0], excerpt: reference.excerpt })),
  };
  return { request, input, response };
}

describe('article style editing', () => {
  it('edits paragraphs while preserving metadata, headings, links, lists and source identities', () => {
    const { request, input, response } = fixture();
    response.edits[0].markdown = 'Descubre estos eventos de trail running en Cataluña y elige tu próxima carrera.';
    const result = apply(response, request, input);
    expect(result.article).toEqual({ ...request.source.article, contentMarkdown: expect.any(String) });
    expect(result.contentHtml).toContain('Descubre estos eventos');
    expect(result.references).toEqual(request.source.references);
    for (const block of input.blocks.filter(block => !block.editable && block.markdown.trim())) expect(result.article.contentMarkdown).toContain(block.markdown.trim());
  });
  it('updates a literal reference while retaining its sources and event', () => {
    const { request, input, response } = fixture();
    const ref = response.references[0];
    const edit = response.edits.find(edit => edit.id === ref.blockId)!;
    edit.markdown = edit.markdown.replace('tiene su centro', 'se celebra');
    ref.excerpt = ref.excerpt.replace('tiene su centro', 'se celebra');
    expect(apply(response, request, input).references[0]).toEqual({ ...request.source.references[0], excerpt: ref.excerpt });
  });
  it.each(['missing', 'duplicate', 'foreign', 'heading', 'link', 'html', 'empty', 'number', 'list'] as const)('rejects %s edits', kind => {
    const { request, input, response } = fixture();
    if (kind === 'missing') response.edits.pop();
    if (kind === 'duplicate') response.edits[0] = response.edits[1];
    if (kind === 'foreign') response.edits[0].id = 'foreign';
    if (kind === 'heading') response.edits[0].markdown = '## New heading';
    if (kind === 'link') response.edits[0].markdown = '[Read](/unapproved)';
    if (kind === 'html') response.edits[0].markdown = '<script>alert(1)</script>';
    if (kind === 'empty') response.edits[0].markdown = ' ';
    if (kind === 'number') response.edits[0].markdown += ' Son 9999 kilómetros.';
    if (kind === 'list') response.edits[0].markdown = '- Una lista nueva';
    expect(() => apply(response, request, input)).toThrow('invalid_content');
  });
  it.each(['missing', 'duplicate', 'absent', 'empty', 'other-event'] as const)('rejects %s references', kind => {
    const { request, input, response } = fixture();
    if (kind === 'missing') response.references.pop();
    if (kind === 'duplicate') response.references[0] = response.references[1];
    if (kind === 'empty') response.references[0].excerpt = ' ';
    if (kind === 'absent') response.references[0].excerpt = 'Una afirmación que no existe.';
    if (kind === 'other-event') { response.references[0].blockId = response.references[1].blockId; response.references[0].excerpt = response.references[1].excerpt; }
    expect(() => apply(response, request, input)).toThrow('invalid_content');
  });
  it('supports partial research and keeps the missing event section empty', () => {
    const context: WritingRequest = structuredClone(writingRequest);
    context.events[0].dossier = null;
    const value = structuredClone(writingResponse);
    const start = value.contentMarkdown.indexOf(`## ${context.events[0].eventName}`);
    const end = value.contentMarkdown.indexOf(`## ${context.events[1].eventName}`);
    value.contentMarkdown = value.contentMarkdown.slice(0, start) + `## ${context.events[0].eventName}\n\n` + value.contentMarkdown.slice(end);
    value.references.shift();
    const request = { context, source: { ...compose(value, context, prepareContext(context).input), model: 'writer', responseId: 'response', durationMs: 1, usage: null } };
    const input = prepare(request);
    expect(input.blocks.filter(block => block.section === context.events[0].eventName).every(block => !block.editable)).toBe(true);
  });
});
